from django.urls import path

from .views import PublicContactMessageCreateView, PublicProjectDiscoveryCreateView, PublicServiceRequestCreateView

urlpatterns = [
    path("contact/", PublicContactMessageCreateView.as_view(), name="public_contact_create"),
    path("service-requests/", PublicServiceRequestCreateView.as_view(), name="public_service_request_create"),
    path("project-discovery/", PublicProjectDiscoveryCreateView.as_view(), name="public_project_discovery_create"),
]
