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

FAST_TIMEOUTS = dict(DELIVERY_ATTEMPT_TIMEOUT_SECONDS=0.2, DELIVERY_TOTAL_TIMEOUT_SECONDS=0.35)
# attempt timeout >= total budget, so the first attempt alone consumes
# the entire budget (clamped to it) and the second channel is never
# started at all - see process_new_enquiry()'s remaining-budget clamp.
EXHAUST_BUDGET_ON_FIRST_ATTEMPT_TIMEOUTS = dict(
    DELIVERY_ATTEMPT_TIMEOUT_SECONDS=0.3, DELIVERY_TOTAL_TIMEOUT_SECONDS=0.25
)


def make_contact(**overrides):
    defaults = dict(sender_name="Test", email="test@example.com", subject="Subj", message="A test message body.")
    defaults.update(overrides)
    return ContactMessage.objects.create(**defaults)


class DeliveryTimingBudgetTests(TestCase):
    """Regression tests for the corrected timing claim: there is no
    worker, so process_new_enquiry() runs synchronously and the response
    genuinely waits on it - what's bounded is the WAIT, not whether it
    happens. A hanging channel must never block past the configured
    budget, and the already-committed row must remain intact either way.
    """

    @override_settings(**FAST_TIMEOUTS)
    def test_hanging_email_is_bounded_by_the_attempt_timeout(self):
        def hang(*args, **kwargs):
            time.sleep(5)

        obj = make_contact()
        started = time.monotonic()
        with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=hang):
            process_new_enquiry(obj)
        elapsed = time.monotonic() - started

        self.assertLess(elapsed, 2.0)  # generous margin above the 0.35s budget - never the full 5s hang
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        self.assertEqual(obj.email_error, "timed out")

    @override_settings(**EXHAUST_BUDGET_ON_FIRST_ATTEMPT_TIMEOUTS)
    def test_hanging_both_channels_stays_within_total_budget(self):
        def hang(*args, **kwargs):
            time.sleep(5)

        obj = make_contact()
        started = time.monotonic()
        with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=hang), patch(
            "apps.inquiries.services.delivery.is_sheets_configured", return_value=True
        ), patch("apps.inquiries.services.delivery.sync_enquiry_row", side_effect=hang):
            process_new_enquiry(obj)
        elapsed = time.monotonic() - started

        self.assertLess(elapsed, 2.0)  # bounded, not the full 10s (2 x 5s) both channels would otherwise take
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        # The first attempt alone consumed the whole budget (clamped to
        # it) - Sheets is never started at all, left PENDING rather than
        # a second hung attempt.
        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.PENDING)


class DeliveryTimingResponseSafetyTests(ThrottleSafeAPITestCase):
    @override_settings(**FAST_TIMEOUTS)
    def test_response_still_succeeds_when_delivery_hangs(self):
        def hang(*args, **kwargs):
            time.sleep(5)

        with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=hang):
            response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ContactMessage.objects.get()
        self.assertEqual(response.data["reference_id"], obj.reference_id)
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
