from unittest.mock import patch

from django.core import mail
from rest_framework import status
from apps.inquiries.tests.base import ThrottleSafeAPITestCase

from apps.inquiries.models import ContactMessage, EmailDeliveryStatus

CONTACT_URL = "/api/v1/public/inquiries/contact/"

CONTACT_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test subject",
    "message": "Test message body long enough.",
}


class EmailNotificationTests(ThrottleSafeAPITestCase):
    def test_success_sends_one_email_with_safe_reply_to(self):
        response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        sent = mail.outbox[0]
        self.assertEqual(sent.reply_to, [CONTACT_PAYLOAD["email"]])
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.SENT)
        self.assertEqual(obj.email_attempts, 1)
        self.assertIn(obj.reference_id, sent.subject)

    def test_failure_after_db_save_does_not_delete_or_duplicate_the_row(self):
        with patch(
            "apps.inquiries.services.delivery.send_enquiry_notification",
            side_effect=RuntimeError("simulated smtp auth failure with password Sup3rSecret!"),
        ):
            response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        self.assertEqual(obj.sender_name, CONTACT_PAYLOAD["sender_name"])

    def test_failure_error_summary_never_contains_raw_exception_text(self):
        with patch(
            "apps.inquiries.services.delivery.send_enquiry_notification",
            side_effect=RuntimeError("smtp auth failed for user with password Sup3rSecret!"),
        ):
            self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        obj = ContactMessage.objects.get()
        self.assertNotIn("Sup3rSecret", obj.email_error)
        self.assertIn("RuntimeError", obj.email_error)

    def test_header_injection_attempt_fails_safely_not_a_crash(self):
        """Django's own forbid_multi_line_headers rejects a newline in the
        subject - this must surface as a recorded, safe failure (the row
        still exists, the response is still a normal success), never as
        an unhandled exception or an actually-injected header."""
        payload = {**CONTACT_PAYLOAD, "subject": "Evil\r\nBcc: attacker@example.com"}
        response = self.client.post(CONTACT_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        self.assertEqual(len(mail.outbox), 0)
