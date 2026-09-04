import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from rest_framework import serializers

from apps.inquiries.models import ContactMessage, ServiceRequest

logger = logging.getLogger(__name__)


def _send_notification(template_base: str, subject: str, payload: dict) -> None:
    """Send the admin notification email. Raises on failure - callers at the
    intake boundary (below) are responsible for deciding whether that
    failure should affect the response; this function's own contract is
    unchanged so it stays independently testable and reusable."""
    text_body = render_to_string(f"emails/{template_base}.txt", payload)
    html_body = render_to_string(f"emails/{template_base}.html", payload)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.ADMIN_NOTIFICATION_EMAIL],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


def _notify_best_effort(inquiry_type: str, inquiry_id: int, template_base: str, subject: str, payload: dict) -> None:
    """CF-H1: the inquiry itself is already persisted by the time this is
    called - a notification failure here must never turn an already-saved,
    valid inquiry into a failed API response. Logs a sanitized operational
    error (inquiry type/id and the exception's class name only - never the
    message body, and never the exception's own str(), since some email
    client libraries embed connection/auth detail in their exception text)
    so a failing notification is never silent, without ever suppressing
    the underlying failure mode inside _send_notification() itself.
    """
    try:
        _send_notification(template_base=template_base, subject=subject, payload=payload)
    except Exception as exc:
        logger.error(
            "Inquiry notification failed: type=%s id=%s exception_class=%s",
            inquiry_type,
            inquiry_id,
            type(exc).__name__,
        )


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = "__all__"
        read_only_fields = ("status", "admin_notes", "created_at", "updated_at")

    def create(self, validated_data):
        message = super().create(validated_data)
        _notify_best_effort(
            inquiry_type="ContactMessage",
            inquiry_id=message.pk,
            template_base="contact_notification",
            subject=f"[Portfolio] New Contact Message: {message.subject}",
            payload={"obj": message},
        )
        return message


class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = "__all__"
        read_only_fields = ("status", "admin_notes", "created_at", "updated_at")

    def create(self, validated_data):
        request_obj = super().create(validated_data)
        _notify_best_effort(
            inquiry_type="ServiceRequest",
            inquiry_id=request_obj.pk,
            template_base="service_request_notification",
            subject=f"[Portfolio] New Service Request: {request_obj.subject}",
            payload={"obj": request_obj},
        )
        return request_obj


class AdminContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = "__all__"


class AdminServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = "__all__"
