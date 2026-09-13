from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.inquiries.models import (
    REFERENCE_ID_PREFIX,
    ContactMessage,
    EmailDeliveryStatus,
    ReviewStatus,
    SheetsDeliveryStatus,
    validate_intent,
    validate_source_page,
)


def make_contact(**overrides):
    defaults = dict(sender_name="Test", email="test@example.com", subject="Subj", message="A test message body.")
    defaults.update(overrides)
    return ContactMessage.objects.create(**defaults)


class ReferenceIdTests(TestCase):
    def test_format_and_length(self):
        obj = make_contact()
        self.assertTrue(obj.reference_id.startswith(REFERENCE_ID_PREFIX))
        self.assertEqual(len(obj.reference_id), len(REFERENCE_ID_PREFIX) + 8)

    def test_unique_across_rows(self):
        a = make_contact()
        b = make_contact(email="other@example.com")
        self.assertNotEqual(a.reference_id, b.reference_id)

    def test_collision_at_save_time_is_retried_safely(self):
        taken = make_contact()

        colliding = ContactMessage(
            sender_name="Two", email="two@example.com", subject="S", message="Another message body here."
        )
        colliding.reference_id = taken.reference_id  # force an explicit, already-taken value

        with patch("apps.inquiries.models.generate_reference_id", return_value="SK-FRESH99"):
            colliding.save()

        self.assertEqual(colliding.reference_id, "SK-FRESH99")
        self.assertNotEqual(colliding.reference_id, taken.reference_id)
        self.assertEqual(ContactMessage.objects.count(), 2)

    def test_exhausted_collision_retries_raise_clearly(self):
        taken = make_contact()
        colliding = ContactMessage(
            sender_name="Two", email="two@example.com", subject="S", message="Another message body here."
        )
        colliding.reference_id = taken.reference_id

        with patch("apps.inquiries.models.generate_reference_id", return_value=taken.reference_id):
            with self.assertRaises(RuntimeError):
                colliding.save()


class DeliveryStateTests(TestCase):
    def test_spam_overrides_everything(self):
        obj = make_contact(
            status=ReviewStatus.SPAM,
            email_status=EmailDeliveryStatus.SKIPPED,
            sheets_status=SheetsDeliveryStatus.SKIPPED,
        )
        self.assertEqual(obj.delivery_state, "spam")

    def test_pending_when_either_channel_unattempted(self):
        obj = make_contact()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.PENDING)
        self.assertEqual(obj.delivery_state, "delivery_pending")

    def test_pending_when_only_sheets_unattempted(self):
        obj = make_contact(email_status=EmailDeliveryStatus.SENT)
        self.assertEqual(obj.delivery_state, "delivery_pending")

    def test_delivered_when_both_ok(self):
        obj = make_contact(email_status=EmailDeliveryStatus.SENT, sheets_status=SheetsDeliveryStatus.NOT_CONFIGURED)
        self.assertEqual(obj.delivery_state, "delivered")

    def test_delivered_with_warning_when_a_channel_failed(self):
        obj = make_contact(email_status=EmailDeliveryStatus.SENT, sheets_status=SheetsDeliveryStatus.FAILED)
        self.assertEqual(obj.delivery_state, "delivered_with_warning")

    def test_no_stored_processing_status_field(self):
        # Regression guard for the "misleading aggregate" correction -
        # there must be no persisted field pretending to summarize
        # delivery; delivery_state is always computed live.
        field_names = {f.name for f in ContactMessage._meta.get_fields()}
        self.assertNotIn("processing_status", field_names)


class ValidatorTests(TestCase):
    def test_valid_intent_passes(self):
        validate_intent("hiring")  # no raise

    def test_blank_intent_is_allowed(self):
        validate_intent("")

    def test_invalid_intent_raises(self):
        with self.assertRaises(ValidationError):
            validate_intent("nonsense")

    def test_valid_source_pages_accepted(self):
        for page in ("", "/", "/contact", "/work", "/work/my-slug", "/services/my-slug", "/privacy"):
            validate_source_page(page)

    def test_invalid_source_page_rejected(self):
        for page in ("https://evil.example.com", "/../etc/passwd", "/contact?x=1", "/unknown-route"):
            with self.assertRaises(ValidationError):
                validate_source_page(page)
