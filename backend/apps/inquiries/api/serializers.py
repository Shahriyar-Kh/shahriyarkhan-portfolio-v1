from rest_framework import serializers

from apps.inquiries.models import ContactMessage, EnquirySource, ServiceRequest
from apps.inquiries.services.discovery_summary import build_summary


class HoneypotMixin(serializers.Serializer):
    """Write-only field name matches the frontend's hidden `website`
    input. A non-empty value never blocks the request or reveals
    detection - it's mapped to honeypot_triggered, and services/delivery.py
    treats that as terminal (forced to spam, no email/Sheets attempted)."""

    website = serializers.CharField(required=False, allow_blank=True, write_only=True, default="")
    submission_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def _pop_tracking_fields(self, validated_data: dict) -> dict:
        website_value = validated_data.pop("website", "") or ""
        validated_data["honeypot_triggered"] = bool(website_value.strip())
        if validated_data.get("submission_id") is None:
            validated_data.pop("submission_id", None)
        return validated_data


class ContactMessageSerializer(HoneypotMixin, serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = (
            "sender_name",
            "email",
            "subject",
            "service_type_text",
            "message",
            "intent",
            "source_page",
            "submission_id",
            "website",
        )

    def create(self, validated_data):
        return super().create(self._pop_tracking_fields(validated_data))


class ServiceRequestSerializer(HoneypotMixin, serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = (
            "sender_name",
            "email",
            "service",
            "subject",
            "service_type_text",
            "message",
            "budget_range",
            "timeline",
            "source_page",
            "intent",
            "submission_id",
            "website",
        )

    def create(self, validated_data):
        return super().create(self._pop_tracking_fields(validated_data))


class ProjectDiscoverySerializer(HoneypotMixin, serializers.ModelSerializer):
    """The structured Client Project Discovery intake (PORTFOLIO-ASSISTANTS-01
    section 12-14) - a deterministic guided wizard, not a free-text chat.
    Persists to the same `ServiceRequest` model and the same
    save()/reference-ID/delivery pipeline as the Contact page's project
    path; only `source` distinguishes the two. `subject`/`message` are
    never typed by the client here - they are derived from the structured
    fields below via `discovery_summary` so the model's existing
    required-field shape needs no changes."""

    # ModelSerializer infers `required=False` for any model field with
    # blank=True (business_problem, expected_outcome, etc. are all
    # blank=True so existing plain ServiceRequest rows stay valid) - these
    # four are semantically required for THIS flow, so they're declared
    # explicitly here to override that inference. Every free-text field
    # also gets an explicit max_length here (PORTFOLIO-ASSISTANTS-02
    # section 9 review): the underlying TextField columns are themselves
    # unbounded, and an unbounded business_problem/expected_outcome/
    # existing_assets/additional_notes could otherwise produce a
    # discovery_summary approaching or exceeding Google Sheets' ~50,000
    # character cell limit, breaking that sync for a pathological
    # submission. The caps below are generous for a genuine enquiry
    # (thousands of characters each) while keeping the total summary
    # safely bounded.
    name = serializers.CharField(source="sender_name", max_length=150)
    project_type = serializers.CharField(max_length=120)
    project_stage = serializers.CharField(max_length=120)
    business_problem = serializers.CharField(max_length=5000)
    expected_outcome = serializers.CharField(max_length=3000)
    existing_assets = serializers.CharField(max_length=3000, required=False, allow_blank=True, default="")
    consent_given = serializers.BooleanField()
    required_features = serializers.ListField(child=serializers.CharField(max_length=200), allow_empty=False, max_length=30)
    optional_features = serializers.ListField(child=serializers.CharField(max_length=200), required=False, default=list, max_length=30)
    preferred_contact_method = serializers.ChoiceField(
        choices=[("email", "email"), ("phone", "phone"), ("whatsapp", "whatsapp")], required=False, allow_blank=True, default=""
    )
    additional_notes = serializers.CharField(max_length=2000, required=False, allow_blank=True, write_only=True, default="")

    class Meta:
        model = ServiceRequest
        fields = (
            "name",
            "email",
            "phone",
            "organization",
            "preferred_contact_method",
            "project_type",
            "project_stage",
            "business_problem",
            "target_users",
            "expected_outcome",
            "required_features",
            "optional_features",
            "existing_assets",
            "budget_range",
            "timeline",
            "technical_preferences",
            "additional_notes",
            "consent_given",
            "source_page",
            "intent",
            "submission_id",
            "website",
        )

    def validate_consent_given(self, value):
        if not value:
            raise serializers.ValidationError("Consent is required to submit a project enquiry.")
        return value

    def create(self, validated_data):
        validated_data = self._pop_tracking_fields(validated_data)
        additional_notes = validated_data.pop("additional_notes", "")
        if additional_notes:
            validated_data["business_problem"] = f"{validated_data['business_problem']}\n\nAdditional notes: {additional_notes}"

        discovery_summary = build_summary(dict(validated_data))
        validated_data["discovery_summary"] = discovery_summary
        validated_data["message"] = discovery_summary
        validated_data["subject"] = f"Project Discovery: {validated_data['project_type']}"[:200]
        validated_data["source"] = EnquirySource.PROJECT_DISCOVERY
        return super().create(validated_data)


# ---- Admin (authenticated) serializers ----
# fields="__all__" for read, but every field a visitor originally
# submitted is read-only here too - only the owner-facing review status
# and admin_notes are writable, matching Phase 5's "never edit the
# visitor's original submission in place" requirement.

_ORIGINAL_SUBMISSION_FIELDS = (
    "id",
    "reference_id",
    "submission_id",
    "sender_name",
    "email",
    "subject",
    "service_type_text",
    "message",
    "intent",
    "source_page",
    "honeypot_triggered",
    "email_status",
    "email_attempts",
    "email_last_attempt_at",
    "email_error",
    "sheets_status",
    "sheets_attempts",
    "sheets_last_attempt_at",
    "sheets_error",
    "created_at",
    "updated_at",
)


class AdminContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = "__all__"
        read_only_fields = _ORIGINAL_SUBMISSION_FIELDS


class AdminServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = "__all__"
        # service/budget_range/timeline and everything from `phone` onward
        # are ServiceRequest-only original visitor-submitted fields (the
        # latter group added for Project Discovery, PORTFOLIO-ASSISTANTS-01
        # section 13), not present on ContactMessage, so they aren't in the
        # shared _ORIGINAL_SUBMISSION_FIELDS tuple above.
        read_only_fields = _ORIGINAL_SUBMISSION_FIELDS + (
            "service",
            "budget_range",
            "timeline",
            "phone",
            "source",
            "organization",
            "project_type",
            "project_stage",
            "business_problem",
            "target_users",
            "expected_outcome",
            "required_features",
            "optional_features",
            "existing_assets",
            "technical_preferences",
            "preferred_contact_method",
            "discovery_summary",
            "consent_given",
        )
