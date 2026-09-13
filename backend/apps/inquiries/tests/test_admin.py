import csv
import io
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib import admin as django_admin
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.inquiries.admin import ContactMessageAdmin, ServiceRequestAdmin, export_as_csv, retry_email_notification, retry_sheets_sync
from apps.inquiries.api.serializers import AdminContactMessageSerializer, AdminServiceRequestSerializer
from apps.inquiries.models import ContactMessage, ReviewStatus, ServiceRequest

User = get_user_model()
ADMIN_PATH = settings.ADMIN_URL_PATH.strip("/")
CHANGELIST_URL = f"/{ADMIN_PATH}/inquiries/contactmessage/"
WRITABLE_ALLOWED_FIELDS = {"status", "admin_notes"}


def make_contact(**overrides):
    defaults = dict(sender_name="Test", email="test@example.com", subject="Subj", message="A test message body.")
    defaults.update(overrides)
    return ContactMessage.objects.create(**defaults)


class AdminAuthTests(TestCase):
    def test_anonymous_is_not_let_straight_in(self):
        response = self.client.get(CHANGELIST_URL)
        self.assertNotEqual(response.status_code, 200)

    def test_authenticated_non_admin_is_forbidden(self):
        user = User.objects.create_user(username="regular", password="x", is_staff=True)
        self.client.force_login(user)
        response = self.client.get(CHANGELIST_URL)
        self.assertEqual(response.status_code, 403)

    def test_superuser_can_access(self):
        user = User.objects.create_superuser(username="owner", password="x", email="owner@example.com")
        self.client.force_login(user)
        response = self.client.get(CHANGELIST_URL)
        self.assertEqual(response.status_code, 200)


class AdminFilterSearchTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username="owner2", password="x", email="owner2@example.com")
        self.client.force_login(self.user)
        self.hiring = make_contact(email="hiring@example.com", intent="hiring", reference_id="")
        self.general = make_contact(email="general@example.com", intent="general", reference_id="")

    def test_filter_by_intent(self):
        response = self.client.get(CHANGELIST_URL, {"intent": "hiring"})
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.hiring.reference_id.encode(), response.content)
        self.assertNotIn(self.general.reference_id.encode(), response.content)

    def test_search_by_reference_id(self):
        response = self.client.get(CHANGELIST_URL, {"q": self.hiring.reference_id})
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.hiring.reference_id.encode(), response.content)


class AdminReadonlyFieldsTests(TestCase):
    def test_original_submission_fields_are_never_editable(self):
        model_admin = ContactMessageAdmin(ContactMessage, django_admin.site)
        readonly = model_admin.get_readonly_fields(request=None)
        for field in ("sender_name", "email", "subject", "message", "reference_id", "intent", "honeypot_triggered"):
            self.assertIn(field, readonly)

    def test_status_and_admin_notes_stay_editable(self):
        model_admin = ContactMessageAdmin(ContactMessage, django_admin.site)
        readonly = model_admin.get_readonly_fields(request=None)
        self.assertNotIn("status", readonly)
        self.assertNotIn("admin_notes", readonly)

    def test_every_model_field_is_readonly_or_the_two_allowed_writable_fields(self):
        """Regression guard (found in the pre-release audit: service,
        budget_range, and timeline were originally missing from both
        readonly lists, leaving them editable) - every real model field
        must be covered by exactly one of readonly_fields or
        WRITABLE_ALLOWED_FIELDS, on both Django admin and the admin API,
        for both models."""
        cases = [
            (ContactMessage, ContactMessageAdmin, AdminContactMessageSerializer),
            (ServiceRequest, ServiceRequestAdmin, AdminServiceRequestSerializer),
        ]
        for model, admin_cls, serializer_cls in cases:
            field_names = {f.name for f in model._meta.get_fields() if hasattr(f, "attname") and f.name != "id"}
            model_admin = admin_cls(model, django_admin.site)
            admin_readonly = set(model_admin.get_readonly_fields(request=None))
            api_readonly = set(serializer_cls.Meta.read_only_fields)

            missing_from_admin = field_names - admin_readonly - WRITABLE_ALLOWED_FIELDS
            missing_from_api = field_names - api_readonly - WRITABLE_ALLOWED_FIELDS
            self.assertEqual(missing_from_admin, set(), f"{model.__name__}: editable via Django admin")
            self.assertEqual(missing_from_api, set(), f"{model.__name__}: editable via admin API")


class AdminRetryActionTests(TestCase):
    def test_retry_email_action_runs_once_per_selected_object(self):
        obj = make_contact()
        modeladmin = MagicMock()
        request = MagicMock()

        with patch("apps.inquiries.admin.attempt_email_notification") as mock_attempt:
            retry_email_notification(modeladmin, request, ContactMessage.objects.filter(pk=obj.pk))

        mock_attempt.assert_called_once_with(obj)

    def test_retry_sheets_action_runs_once_per_selected_object(self):
        obj = make_contact()
        modeladmin = MagicMock()
        request = MagicMock()

        with patch("apps.inquiries.admin.attempt_sheets_sync") as mock_attempt:
            retry_sheets_sync(modeladmin, request, ContactMessage.objects.filter(pk=obj.pk))

        mock_attempt.assert_called_once_with(obj)


class AdminCsvExportTests(TestCase):
    def test_export_includes_rows_and_neutralizes_formula_prefixes(self):
        make_contact(sender_name="=cmd|calc", email="a@example.com")
        modeladmin = MagicMock()
        modeladmin.model = ContactMessage

        response = export_as_csv(modeladmin, request=MagicMock(), queryset=ContactMessage.objects.all())

        rows = list(csv.reader(io.StringIO(response.content.decode())))
        header, data_row = rows[0], rows[1]
        sender_name_value = data_row[header.index("sender_name")]
        self.assertTrue(sender_name_value.startswith("'"))


class AdminStatusActionTests(TestCase):
    def test_mark_actions_cover_every_review_status(self):
        from apps.inquiries.admin import _STATUS_ACTIONS

        described = {action.short_description for action in _STATUS_ACTIONS}
        for _, label in ReviewStatus.choices:
            self.assertIn(f"Mark as {label}", described)
