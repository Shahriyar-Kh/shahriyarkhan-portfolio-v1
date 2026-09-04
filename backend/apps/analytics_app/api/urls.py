from django.urls import path

from .views import PublicAnalyticsEventCreateView

urlpatterns = [
    path("events/", PublicAnalyticsEventCreateView.as_view(), name="public_analytics_event_create"),
]
