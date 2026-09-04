from django.urls import path

from .views import AdminSiteSettingView

urlpatterns = [
    path("settings/", AdminSiteSettingView.as_view(), name="admin_site_settings"),
]
