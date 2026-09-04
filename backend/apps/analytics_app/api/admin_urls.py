from django.urls import path

from .views import AdminAnalyticsOverviewView

urlpatterns = [
    path("overview/", AdminAnalyticsOverviewView.as_view(), name="admin_analytics_overview"),
]
