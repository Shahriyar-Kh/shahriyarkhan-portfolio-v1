from django.urls import path

from .views import PublicContactMessageCreateView, PublicServiceRequestCreateView

urlpatterns = [
    path("contact/", PublicContactMessageCreateView.as_view(), name="public_contact_create"),
    path("service-requests/", PublicServiceRequestCreateView.as_view(), name="public_service_request_create"),
]
