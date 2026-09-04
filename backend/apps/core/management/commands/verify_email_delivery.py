from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.inquiries.api.serializers import ContactMessageSerializer, ServiceRequestSerializer
from apps.portfolio.models import Service


class Command(BaseCommand):
    help = "Send live contact and service request email notifications to verify Gmail API or SMTP delivery."

    def add_arguments(self, parser):
        parser.add_argument("--name", default="Email Verification Bot")
        parser.add_argument("--email", default="noreply@example.com")
        parser.add_argument("--cleanup", action="store_true", help="Delete created test records after sending emails.")

    def handle(self, *args, **options):
        email_backend = (settings.EMAIL_BACKEND or "").strip().lower()
        uses_gmail_api = email_backend == "apps.core.email_backends.gmail_api.gmailapiemailbackend"

        if uses_gmail_api:
            if not (
                getattr(settings, "GMAIL_API_CLIENT_ID", "")
                and getattr(settings, "GMAIL_API_CLIENT_SECRET", "")
                and getattr(settings, "GMAIL_API_REFRESH_TOKEN", "")
                and settings.ADMIN_NOTIFICATION_EMAIL
                and settings.DEFAULT_FROM_EMAIL
            ):
                raise CommandError(
                    "Gmail API is not fully configured. Set GMAIL_API_CLIENT_ID, GMAIL_API_CLIENT_SECRET, GMAIL_API_REFRESH_TOKEN, DEFAULT_FROM_EMAIL, and ADMIN_NOTIFICATION_EMAIL before running verification."
                )
        else:
            if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD or not settings.ADMIN_NOTIFICATION_EMAIL:
                raise CommandError(
                    "SMTP is not configured. Set EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, and ADMIN_NOTIFICATION_EMAIL before running verification."
                )

        name = options["name"]
        sender_email = options["email"]

        contact_serializer = ContactMessageSerializer(
            data={
                "sender_name": name,
                "email": sender_email,
                "subject": "[Verification] Contact notification",
                "service_type_text": "Verification",
                "message": "This is a live email delivery verification for contact submission.",
            }
        )
        contact_serializer.is_valid(raise_exception=True)
        contact_message = contact_serializer.save()

        service = Service.objects.filter(status="published").order_by("display_order").first()
        service_serializer = ServiceRequestSerializer(
            data={
                "sender_name": name,
                "email": sender_email,
                "service": service.id if service else None,
                "service_type_text": service.title if service else "Verification Service",
                "subject": "[Verification] Service request notification",
                "message": "This is a live email delivery verification for service request submission.",
                "budget_range": "Verification",
                "timeline": "Verification",
                "source_page": "/verification",
            }
        )
        service_serializer.is_valid(raise_exception=True)
        service_request = service_serializer.save()

        self.stdout.write(self.style.SUCCESS("Both verification emails were sent successfully."))
        self.stdout.write(f"ContactMessage ID: {contact_message.id}")
        self.stdout.write(f"ServiceRequest ID: {service_request.id}")

        if options["cleanup"]:
            contact_message.delete()
            service_request.delete()
            self.stdout.write(self.style.NOTICE("Verification records were deleted (--cleanup)."))
