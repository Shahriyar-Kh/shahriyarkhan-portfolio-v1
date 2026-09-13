import uuid
from unittest.mock import patch

from django.core import mail
from django.db import IntegrityError
from rest_framework import status
from apps.inquiries.tests.base import ThrottleSafeAPITestCase

from apps.inquiries.models import ContactMessage, EmailDeliveryStatus, ReviewStatus, ServiceRequest, SheetsDeliveryStatus

CONTACT_URL = "/api/v1/public/inquiries/contact/"
SERVICE_REQUEST_URL = "/api/v1/public/inquiries/service-requests/"

CONTACT_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test subject",
    "message": "Test message body long enough.",
}

SERVICE_REQUEST_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test service subject",
    "message": "Test service message body long enough.",
}


class PersistenceTests(ThrottleSafeAPITestCase):
    """DB-first, database-is-authoritative behavior for every enquiry
    "type" the brief calls out: recruiter, project, and technical/general
    - all captured via `intent`, not a separate model."""

    def test_recruiter_enquiry_persists(self):
        payload = {**CONTACT_PAYLOAD, "intent": "hiring"}
        response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.intent, "hiring")
        self.assertEqual(response.data, {"reference_id": obj.reference_id})

    def test_contact_message_stores_an_explicit_source_page(self):
        """CONTACT-OPS-01-PROD-INCIDENT-01: the production bug was in the
        frontend's payload composition (it never sent source_page for
        message-mode intents), not the backend - this proves the API
        itself correctly accepts and stores it for ContactMessage exactly
        like it already does for ServiceRequest."""
        payload = {**CONTACT_PAYLOAD, "intent": "general", "source_page": "/contact"}
        response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.source_page, "/contact")

    def test_general_technical_enquiry_persists(self):
        payload = {**CONTACT_PAYLOAD, "intent": "api_backend"}
        response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.intent, "api_backend")

    def test_project_enquiry_persists(self):
        payload = {**SERVICE_REQUEST_PAYLOAD, "intent": "freelance_project"}
        response = self.client.post(SERVICE_REQUEST_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ServiceRequest.objects.count(), 1)
        obj = ServiceRequest.objects.get()
        self.assertEqual(obj.intent, "freelance_project")

    def test_missing_required_field_is_a_validation_error(self):
        payload = dict(CONTACT_PAYLOAD)
        payload.pop("email")
        response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_database_first_even_when_both_channels_fail(self):
        with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=RuntimeError("boom")):
            response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)


class ValidationTests(ThrottleSafeAPITestCase):
    def test_invalid_intent_is_rejected(self):
        payload = {**CONTACT_PAYLOAD, "intent": "not-a-real-intent"}
        response = self.client.post(CONTACT_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_invalid_source_page_is_rejected(self):
        payload = {**CONTACT_PAYLOAD, "source_page": "https://not-our-site.example.com"}
        response = self.client.post(CONTACT_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_source_page_is_accepted(self):
        payload = {**CONTACT_PAYLOAD, "source_page": "/contact"}
        response = self.client.post(CONTACT_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class HoneypotTests(ThrottleSafeAPITestCase):
    def test_honeypot_triggers_spam_and_skips_both_channels(self):
        payload = {**CONTACT_PAYLOAD, "website": "http://spam.example.com"}

        with patch("apps.inquiries.services.delivery.attempt_email_notification") as mock_email, patch(
            "apps.inquiries.services.delivery.attempt_sheets_sync"
        ) as mock_sheets:
            response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ContactMessage.objects.get()
        self.assertTrue(obj.honeypot_triggered)
        self.assertEqual(obj.status, ReviewStatus.SPAM)
        self.assertEqual(obj.email_status, EmailDeliveryStatus.SKIPPED)
        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.SKIPPED)
        self.assertEqual(len(mail.outbox), 0)
        mock_email.assert_not_called()
        mock_sheets.assert_not_called()

    def test_honeypot_response_is_indistinguishable_from_normal_success(self):
        clean_response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")
        bot_response = self.client.post(
            CONTACT_URL, {**CONTACT_PAYLOAD, "email": "bot@example.com", "website": "spam"}, format="json"
        )
        self.assertEqual(set(clean_response.data.keys()), set(bot_response.data.keys()))
        self.assertEqual(clean_response.status_code, bot_response.status_code)


class IdempotencyTests(ThrottleSafeAPITestCase):
    def test_same_submission_id_twice_creates_one_row(self):
        submission_id = str(uuid.uuid4())
        payload = {**CONTACT_PAYLOAD, "submission_id": submission_id}

        first = self.client.post(CONTACT_URL, payload, format="json")
        second = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["reference_id"], second.data["reference_id"])
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_replay_does_not_re_run_delivery(self):
        submission_id = str(uuid.uuid4())
        payload = {**CONTACT_PAYLOAD, "submission_id": submission_id}
        self.client.post(CONTACT_URL, payload, format="json")

        with patch("apps.inquiries.api.views.process_new_enquiry") as mock_process:
            self.client.post(CONTACT_URL, payload, format="json")

        mock_process.assert_not_called()

    def test_integrity_error_race_recovers_to_single_row_without_crashing(self):
        """Regression test for the corrected transaction pattern: the
        except-IntegrityError branch's re-fetch must run strictly after
        the atomic() block has exited, never inside a transaction a
        just-caught exception left broken (that would raise
        TransactionManagementError instead of succeeding, as this test
        would then fail).

        The "concurrent" winner is created for real, BEFORE the request
        and outside any transaction this test controls, so it survives
        the view's own atomic() block rolling back when the (simulated)
        IntegrityError fires - exactly like a truly concurrent request's
        independently-committed row would. The view's own pre-check query
        is forced to miss once (simulating that the race window closed
        before our check but before our insert), which is what actually
        drives execution into the try/except path this test exists to
        prove."""
        submission_id = uuid.uuid4()
        payload = {**CONTACT_PAYLOAD, "submission_id": str(submission_id)}

        winner = ContactMessage.objects.create(
            sender_name="Concurrent",
            email="concurrent@example.com",
            subject="S",
            message="A sufficiently long message body here.",
            submission_id=submission_id,
        )

        real_filter = ContactMessage.objects.filter
        pre_check_calls = {"n": 0}

        def fake_filter(*args, **kwargs):
            pre_check_calls["n"] += 1
            if pre_check_calls["n"] == 1:
                return ContactMessage.objects.none()
            return real_filter(*args, **kwargs)

        def fake_create(self, validated_data):
            raise IntegrityError("duplicate key value violates unique constraint")

        with patch.object(ContactMessage.objects, "filter", side_effect=fake_filter), patch(
            "apps.inquiries.api.serializers.ContactMessageSerializer.create", fake_create
        ):
            response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(response.data["reference_id"], winner.reference_id)


class ResponseSafetyTests(ThrottleSafeAPITestCase):
    def test_success_response_has_only_reference_id(self):
        response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")
        self.assertEqual(set(response.data.keys()), {"reference_id"})
        self.assertNotIn("id", response.data)
        self.assertNotIn("status", response.data)
        self.assertNotIn("admin_notes", response.data)
        self.assertNotIn("email_error", response.data)

    def test_validation_error_never_leaks_internal_detail(self):
        response = self.client.post(CONTACT_URL, {}, format="json")
        body = str(response.data)
        self.assertNotIn("Traceback", body)
        self.assertNotIn("DoesNotExist", body)
