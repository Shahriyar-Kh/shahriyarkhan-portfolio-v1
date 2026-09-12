from rest_framework import serializers

from apps.inquiries.models import ContactMessage, ServiceRequest


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
        # service/budget_range/timeline are ServiceRequest-only original
        # visitor-submitted fields, not present on ContactMessage, so they
        # aren't in the shared _ORIGINAL_SUBMISSION_FIELDS tuple above.
        read_only_fields = _ORIGINAL_SUBMISSION_FIELDS + ("service", "budget_range", "timeline")
