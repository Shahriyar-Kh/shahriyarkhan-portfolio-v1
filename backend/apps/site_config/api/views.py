from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.accounts.permissions import IsPortfolioAdmin
from apps.site_config.api.serializers import SiteSettingSerializer
from apps.site_config.models import SiteSetting


class PublicSiteSettingView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = SiteSettingSerializer

    def get_object(self):
        return SiteSetting.get_solo()


class AdminSiteSettingView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = SiteSettingSerializer

    def get_object(self):
        return SiteSetting.get_solo()
