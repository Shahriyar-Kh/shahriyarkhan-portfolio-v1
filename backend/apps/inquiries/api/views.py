from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny

from apps.accounts.permissions import IsPortfolioAdmin
from apps.inquiries.api.serializers import (
    AdminContactMessageSerializer,
    AdminServiceRequestSerializer,
    ContactMessageSerializer,
    ServiceRequestSerializer,
)
from apps.inquiries.models import ContactMessage, ServiceRequest


class PublicContactMessageCreateView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ContactMessageSerializer
    queryset = ContactMessage.objects.all()


class PublicServiceRequestCreateView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ServiceRequestSerializer
    queryset = ServiceRequest.objects.all()


class AdminContactMessageViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = AdminContactMessageSerializer
    queryset = ContactMessage.objects.all()
    filterset_fields = ("status",)
    search_fields = ("sender_name", "email", "subject")
    ordering_fields = ("created_at", "updated_at")


class AdminServiceRequestViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = AdminServiceRequestSerializer
    queryset = ServiceRequest.objects.all()
    filterset_fields = ("status", "service")
    search_fields = ("sender_name", "email", "subject", "service_type_text")
    ordering_fields = ("created_at", "updated_at")
