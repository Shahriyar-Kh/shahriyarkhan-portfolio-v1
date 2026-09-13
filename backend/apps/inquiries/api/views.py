from django.conf import settings
from django.db import IntegrityError, transaction
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.permissions import IsPortfolioAdmin
from apps.inquiries.api.serializers import (
    AdminContactMessageSerializer,
    AdminServiceRequestSerializer,
    ContactMessageSerializer,
    ServiceRequestSerializer,
)
from apps.inquiries.models import ContactMessage, ServiceRequest
from apps.inquiries.services.delivery import attempt_email_notification, attempt_sheets_sync, process_new_enquiry


class ClientIPThrottleMixin:
    """Prefers Cloudflare's own client-IP header only when explicitly
    told to trust it (TRUST_CLOUDFLARE_CONNECTING_IP) - off by default,
    since repo evidence shows the public API is reached directly at
    Railway's own host today, not through a Cloudflare-proxied domain
    (see CONTACT-OPS-01's plan). Falls back to DRF's own NUM_PROXIES-based
    X-Forwarded-For handling, which already ignores anything a client
    prepends beyond the configured trusted hop count."""

    def get_ident(self, request):
        if getattr(settings, "TRUST_CLOUDFLARE_CONNECTING_IP", False):
            cf_ip = request.META.get("HTTP_CF_CONNECTING_IP")
            if cf_ip:
                return cf_ip.strip()
        return super().get_ident(request)


class ContactFormThrottle(ClientIPThrottleMixin, ScopedRateThrottle):
    pass


class IdempotentPublicCreateMixin:
    """Shared by both public inquiry endpoints:

    1. A client-supplied submission_id that already exists returns the
       existing row's reference_id with 200 - no new row, no re-run of
       email/Sheets delivery. This, not "disable the submit button", is
       the real duplicate-submission defense.
    2. Otherwise the row is inserted inside its own transaction.atomic()
       block. IntegrityError is caught OUTSIDE that block (the except
       clause runs only after the atomic() context has already exited
       and Django has rolled back to/released its savepoint) - the
       re-fetch-by-submission_id query below never runs against a
       transaction a just-caught exception left broken.
    3. Only a genuinely new row triggers process_new_enquiry(); a 200
       idempotent replay never re-attempts delivery.
    4. The public response is always exactly {"reference_id": ...} -
       never the internal DB id, never delivery/internal error detail.
    """

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        model = self.get_queryset().model

        submission_id = serializer.validated_data.get("submission_id")
        if submission_id:
            existing = model.objects.filter(submission_id=submission_id).first()
            if existing is not None:
                return Response({"reference_id": existing.reference_id}, status=status.HTTP_200_OK)

        try:
            with transaction.atomic():
                obj = serializer.save()
        except IntegrityError:
            if not submission_id:
                raise
            existing = model.objects.filter(submission_id=submission_id).first()
            if existing is None:
                raise
            return Response({"reference_id": existing.reference_id}, status=status.HTTP_200_OK)

        process_new_enquiry(obj)
        return Response({"reference_id": obj.reference_id}, status=status.HTTP_201_CREATED)


class PublicContactMessageCreateView(IdempotentPublicCreateMixin, generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all()
    throttle_classes = (ContactFormThrottle,)
    throttle_scope = "contact_form"


class PublicServiceRequestCreateView(IdempotentPublicCreateMixin, generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ServiceRequestSerializer
    queryset = ServiceRequest.objects.all()
    throttle_classes = (ContactFormThrottle,)
    throttle_scope = "contact_form"


class RetryDeliveryActionsMixin:
    """Authenticated-only retry actions backing the Django admin's own
    "Retry email"/"Retry Sheets" buttons (see admin.py) and available here
    too for any other authenticated admin client. Each is exactly one
    more bounded attempt - never a loop."""

    @action(detail=True, methods=["post"])
    def retry_email(self, request, pk=None):
        obj = self.get_object()
        attempt_email_notification(obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    def retry_sheets(self, request, pk=None):
        obj = self.get_object()
        attempt_sheets_sync(obj)
        return Response(self.get_serializer(obj).data)


class AdminContactMessageViewSet(RetryDeliveryActionsMixin, viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = AdminContactMessageSerializer
    queryset = ContactMessage.objects.all()
    filterset_fields = ("status", "intent", "email_status", "sheets_status")
    search_fields = ("reference_id", "sender_name", "email", "subject")
    ordering_fields = ("created_at", "updated_at")


class AdminServiceRequestViewSet(RetryDeliveryActionsMixin, viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = AdminServiceRequestSerializer
    queryset = ServiceRequest.objects.all()
    filterset_fields = ("status", "intent", "service", "email_status", "sheets_status")
    search_fields = ("reference_id", "sender_name", "email", "subject", "service_type_text")
    ordering_fields = ("created_at", "updated_at")
