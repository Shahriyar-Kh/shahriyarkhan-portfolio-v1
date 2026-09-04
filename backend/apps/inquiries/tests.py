from unittest.mock import patch

from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inquiries.models import ContactMessage, ServiceRequest

CONTACT_URL = "/api/v1/public/inquiries/contact/"
SERVICE_REQUEST_URL = "/api/v1/public/inquiries/service-requests/"

CONTACT_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test subject",
    "message": "Test message body.",
}

SERVICE_REQUEST_PAYLOAD = {
    "sender_name": "Test Sender",
    "email": "test-sender@example.com",
    "subject": "Test service subject",
    "message": "Test service message body.",
}


class ContactMessageIntakeResilienceTests(APITestCase):
    """CF-H1: a notification failure must never turn an already-persisted,
    valid ContactMessage into a failed API response."""

    def test_notification_succeeds_object_created_once_and_email_sent(self):
        response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Test subject", mail.outbox[0].subject)

    def test_notification_exception_does_not_fail_the_request(self):
        with patch(
            "apps.inquiries.api.serializers._send_notification",
            side_effect=RuntimeError("simulated notification failure"),
        ):
            response = self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        # The intake itself must succeed - this is the entire point of the fix.
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)
        # No email was actually sent (the mocked call raised before sending).
        self.assertEqual(len(mail.outbox), 0)

    def test_notification_exception_never_creates_duplicate_or_zero_rows(self):
        with patch(
            "apps.inquiries.api.serializers._send_notification",
            side_effect=RuntimeError("simulated notification failure"),
        ):
            self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        # Exactly one row - not zero (the old bug's user-facing symptom was
        # "the API failed" while a row was silently created anyway; this
        # confirms there is still exactly one, not an extra one from any
        # accidental retry logic this fix might have introduced).
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_notification_failure_is_logged_without_exposing_exception_message(self):
        sensitive_looking_message = "smtp auth failed for user with password Sup3rSecret!"
        with self.assertLogs("apps.inquiries.api.serializers", level="ERROR") as captured:
            with patch(
                "apps.inquiries.api.serializers._send_notification",
                side_effect=RuntimeError(sensitive_looking_message),
            ):
                self.client.post(CONTACT_URL, CONTACT_PAYLOAD, format="json")

        joined_output = "\n".join(captured.output)
        self.assertIn("ContactMessage", joined_output)
        self.assertIn("RuntimeError", joined_output)
        # The exception's own message text - which could contain connection
        # or auth detail in a real failure - must never reach the log line.
        self.assertNotIn("Sup3rSecret", joined_output)
        self.assertNotIn(sensitive_looking_message, joined_output)


class ServiceRequestIntakeResilienceTests(APITestCase):
    """Same resilience guarantees as ContactMessage, per CF-H1's identical
    fix applied to ServiceRequestSerializer."""

    def test_notification_succeeds_object_created_once_and_email_sent(self):
        response = self.client.post(SERVICE_REQUEST_URL, SERVICE_REQUEST_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ServiceRequest.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_notification_exception_does_not_fail_the_request(self):
        with patch(
            "apps.inquiries.api.serializers._send_notification",
            side_effect=RuntimeError("simulated notification failure"),
        ):
            response = self.client.post(SERVICE_REQUEST_URL, SERVICE_REQUEST_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ServiceRequest.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 0)

    def test_notification_failure_is_logged(self):
        with self.assertLogs("apps.inquiries.api.serializers", level="ERROR") as captured:
            with patch(
                "apps.inquiries.api.serializers._send_notification",
                side_effect=RuntimeError("simulated notification failure"),
            ):
                self.client.post(SERVICE_REQUEST_URL, SERVICE_REQUEST_PAYLOAD, format="json")

        joined_output = "\n".join(captured.output)
        self.assertIn("ServiceRequest", joined_output)
        self.assertIn("RuntimeError", joined_output)
