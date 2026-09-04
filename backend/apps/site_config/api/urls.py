from django.urls import path

from .views import PublicSiteSettingView

urlpatterns = [
    path("settings/", PublicSiteSettingView.as_view(), name="public_site_settings"),
]
