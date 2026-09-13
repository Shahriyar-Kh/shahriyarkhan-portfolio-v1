import threading
import time
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework import status

from apps.inquiries.models import ContactMessage, EmailDeliveryStatus, SheetsDeliveryStatus
from apps.inquiries.services.delivery import process_new_enquiry
from apps.inquiries.tests.base import ThrottleSafeAPITestCase

CONTACT_URL = "/api/v1/public/inquiries/contact/"
CONTACT_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test subject",
    "message": "Test message body long enough.",
}


def make_contact(**overrides):
    defaults = dict(sender_name="Test", email="test@example.com", subject="Subj", message="A test message body.")
    defaults.update(overrides)
    return ContactMessage.objects.create(**defaults)


class DeliveryTimingBudgetTests(TestCase):
    """CONTACT-OPS-01-PROD-INCIDENT-01: there is no thread/join layer in
    delivery.py anymore - attempt_email_notification/attempt_sheets_sync
    run fully synchronously, bounded only by each channel's own
    already-bounded transport (settings.EMAIL_TIMEOUT; the Sheets
    httplib2 timeout). What's left to test here: (a) a definitive
    transport failure becomes FAILED with the real exception class -
    never the old ambiguous "timed out" marker that couldn't distinguish
    "the send genuinely failed" from "we gave up waiting on an orphaned
    thread" - and (b) the second channel is skipped (left PENDING) once
    the first has already used the whole configured total budget, based
    on real elapsed wall-clock time (no thread to fake it).
    """

    def test_email_transport_failure_is_recorded_with_the_real_exception_class(self):
        obj = make_contact()
        with patch(
            "apps.inquiries.services.delivery.send_enquiry_notification",
            side_effect=TimeoutError("simulated real transport timeout"),
        ):
            process_new_enquiry(obj)

        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        self.assertIn("TimeoutError", obj.email_error)
        # The old bug's own marker - proves this is not that code path.
        self.assertNotEqual(obj.email_error, "timed out")

    def test_no_background_thread_is_spawned_for_a_failing_email_attempt(self):
        obj = make_contact()
        baseline = threading.active_count()
        with patch(
            "apps.inquiries.services.delivery.send_enquiry_notification",
            side_effect=TimeoutError("simulated"),
        ):
            process_new_enquiry(obj)
        # Fully synchronous - no daemon thread left running the instant
        # the call returns. This is the direct regression proof against
        # the "orphaned thread could still succeed after we marked FAILED,
        # so a later admin retry could send a duplicate" incident finding.
        self.assertEqual(threading.active_count(), baseline)

    @override_settings(DELIVERY_TOTAL_TIMEOUT_SECONDS=0.05)
    def test_sheets_is_skipped_once_the_email_attempt_alone_exhausts_the_total_budget(self):
        def slow_email(*args, **kwargs):
            time.sleep(0.1)  # real elapsed time, genuinely exceeds the 0.05s total budget

        obj = make_contact()
        with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=slow_email), patch(
            "apps.inquiries.services.delivery.is_sheets_configured"
        ) as mock_configured:
            process_new_enquiry(obj)

        mock_configured.assert_not_called()
        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.PENDING)

    @override_settings(DELIVERY_TOTAL_TIMEOUT_SECONDS=10, DELIVERY_ATTEMPT_TIMEOUT_SECONDS=10)
    def test_sheets_is_still_attempted_when_budget_remains(self):
        obj = make_contact()
        with patch("apps.inquiries.services.delivery.send_enquiry_notification"), patch(
            "apps.inquiries.services.delivery.is_sheets_configured", return_value=True
        ), patch("apps.inquiries.services.delivery.sync_enquiry_row") as mock_sync:
            process_new_enquiry(obj)

        mock_sync.assert_called_once()
        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.SYNCED)


class DeliveryTimingResponseSafetyTests(ThrottleSafeAPITestCase):
    def test_response_still_succeeds_when_email_delivery_fails(self):
        with patch(
            "apps.inquiries.services.delivery.send_enquiry_notification",
            side_effect=TimeoutError("simulated"),
        ):
            response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ContactMessage.objects.get()
        self.assertEqual(response.data["reference_id"], obj.reference_id)
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
