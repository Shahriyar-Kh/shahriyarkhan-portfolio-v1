import uuid
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework import status

from apps.inquiries.models import EnquirySource, EmailDeliveryStatus, ServiceRequest
from apps.inquiries.tests.base import ThrottleSafeAPITestCase

DISCOVERY_URL = "/api/v1/public/inquiries/project-discovery/"

VALID_PAYLOAD = {
    "name": "Prospective Client",
    "email": "client@example.com",
    "phone": "+1 555 0100",
    "organization": "Acme Co",
    "preferred_contact_method": "email",
    "project_type": "Web application",
    "project_stage": "Idea",
    "business_problem": "We need to manage customer orders more efficiently.",
    "target_users": "Internal operations staff",
    "expected_outcome": "A single dashboard replacing three spreadsheets.",
    "required_features": ["Order tracking", "Customer database"],
    "optional_features": ["Email notifications"],
    "existing_assets": "We have a basic WordPress site at example.com.",
    "budget_range": "$5,000 - $10,000",
    "timeline": "2-3 months",
    "technical_preferences": "No strong preference",
    "additional_notes": "Would like to start soon.",
    "consent_given": True,
    "source_page": "/contact",
}


class ProjectDiscoveryPersistenceTests(ThrottleSafeAPITestCase):
    def test_valid_submission_persists_and_returns_reference_id_and_summary(self):
        response = self.client.post(DISCOVERY_URL, VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("reference_id", response.data)
        self.assertIn("discovery_summary", response.data)
        self.assertEqual(ServiceRequest.objects.count(), 1)

        obj = ServiceRequest.objects.get()
        self.assertEqual(obj.source, EnquirySource.PROJECT_DISCOVERY)
        self.assertEqual(obj.sender_name, "Prospective Client")
        self.assertEqual(obj.required_features, ["Order tracking", "Customer database"])
        self.assertTrue(obj.consent_given)
        self.assertTrue(obj.discovery_summary)
        self.assertTrue(obj.message)
        self.assertTrue(obj.subject.startswith("Project Discovery:"))
        self.assertTrue(obj.reference_id.startswith("SK-"))

    def test_no_account_or_authentication_required(self):
        response = self.client.post(DISCOVERY_URL, VALID_PAYLOAD, format="json")
        self.assertNotIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_missing_required_field_is_rejected(self):
        payload = {**VALID_PAYLOAD}
        del payload["business_problem"]
        response = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ServiceRequest.objects.count(), 0)

    def test_empty_required_features_is_rejected(self):
        payload = {**VALID_PAYLOAD, "required_features": []}
        response = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_business_problem_is_rejected(self):
        """PORTFOLIO-ASSISTANTS-02 section 9: an unbounded TextField-backed
        field could otherwise produce a discovery_summary approaching
        Google Sheets' ~50,000 character cell limit."""
        payload = {**VALID_PAYLOAD, "business_problem": "x" * 5001}
        response = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ServiceRequest.objects.count(), 0)

    def test_excessive_required_features_count_is_rejected(self):
        payload = {**VALID_PAYLOAD, "required_features": [f"feature-{i}" for i in range(31)]}
        response = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consent_is_required(self):
        payload = {**VALID_PAYLOAD, "consent_given": False}
        response = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ServiceRequest.objects.count(), 0)

    def test_honeypot_triggers_silent_spam_marking(self):
        payload = {**VALID_PAYLOAD, "website": "http://spambot.example.com"}
        response = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ServiceRequest.objects.get()
        self.assertTrue(obj.honeypot_triggered)
        self.assertEqual(obj.status, "spam")
        self.assertEqual(obj.email_status, EmailDeliveryStatus.SKIPPED)

    def test_structured_summary_reflects_only_submitted_data(self):
        response = self.client.post(DISCOVERY_URL, VALID_PAYLOAD, format="json")

        summary = response.data["discovery_summary"]
        self.assertIn("Web application", summary)
        self.assertIn("Order tracking", summary)
        # The AI provider defaults to "deterministic" in tests - nothing
        # outside the submitted fields should ever appear in the summary.
        self.assertNotIn("Kubernetes", summary)

    def test_persisted_summary_is_deterministic_even_when_gemini_is_enabled(self):
        """Final persisted intake must contain only visitor-approved
        structured fields; Gemini may assist before review, but never
        rewrites the canonical stored summary."""
        with override_settings(AI_PROVIDER="gemini", GEMINI_API_KEY="test-key"):
            with patch("apps.assistant.services.gemini_client.generate_json") as mock_gemini:
                response = self.client.post(DISCOVERY_URL, VALID_PAYLOAD, format="json")

        mock_gemini.assert_not_called()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("Project stage: Idea", response.data["discovery_summary"])
        self.assertIn("Core scope: Order tracking, Customer database", response.data["discovery_summary"])

    def test_notification_failure_does_not_undo_persistence(self):
        with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=RuntimeError("smtp down")):
            response = self.client.post(DISCOVERY_URL, VALID_PAYLOAD, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        obj = ServiceRequest.objects.get()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        self.assertEqual(len(mail.outbox), 0)

    def test_repeated_submission_id_does_not_create_a_duplicate(self):
        submission_id = str(uuid.uuid4())
        payload = {**VALID_PAYLOAD, "submission_id": submission_id}

        first = self.client.post(DISCOVERY_URL, payload, format="json")
        second = self.client.post(DISCOVERY_URL, payload, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(ServiceRequest.objects.count(), 1)
        self.assertEqual(first.data["reference_id"], second.data["reference_id"])

    def test_admin_serializer_treats_every_discovery_field_as_read_only(self):
        from apps.inquiries.api.serializers import AdminServiceRequestSerializer

        self.client.post(DISCOVERY_URL, VALID_PAYLOAD, format="json")
        obj = ServiceRequest.objects.get()

        serializer = AdminServiceRequestSerializer(obj, data={"project_type": "Tampered"}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        obj.refresh_from_db()
        self.assertEqual(obj.project_type, "Web application")
