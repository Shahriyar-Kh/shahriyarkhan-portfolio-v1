from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory
from rest_framework import status
from rest_framework.test import APITestCase

from apps.site_config.admin import SiteSettingAdmin
from apps.site_config.models import SiteSetting


class PublicSiteSettingsTests(APITestCase):
    """P01A: /api/v1/public/site/settings/ must return valid JSON even
    before any SiteSetting row has ever been saved - the singleton is
    auto-created on first access via SiteSetting.get_solo()."""

    def test_returns_200_with_no_configured_row_yet(self):
        self.assertEqual(SiteSetting.objects.count(), 0)
        response = self.client.get("/api/v1/public/site/settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # get_solo() must have materialized exactly one singleton row.
        self.assertEqual(SiteSetting.objects.count(), 1)

    def test_returns_200_with_configured_data(self):
        SiteSetting.objects.create(
            pk=1,
            site_name="Shahriyar Khan Portfolio",
            owner_name="Shahriyar Khan",
            public_email="shahriyarkhanpk1@gmail.com",
        )
        response = self.client.get("/api/v1/public/site/settings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["owner_name"], "Shahriyar Khan")

    def test_get_solo_always_returns_pk_1_singleton(self):
        first = SiteSetting.get_solo()
        second = SiteSetting.get_solo()
        self.assertEqual(first.pk, 1)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(SiteSetting.objects.count(), 1)


class SiteSettingAdminTests(APITestCase):
    def test_singleton_admin_hides_add_after_row_exists_and_never_allows_delete(self):
        model_admin = SiteSettingAdmin(SiteSetting, AdminSite())
        request = RequestFactory().get("/admin/site-config/")
        request.user = type(
            "AdminUser",
            (),
            {
                "has_perm": lambda *_args, **_kwargs: True,
                "is_active": True,
                "is_staff": True,
            },
        )()

        self.assertTrue(model_admin.has_add_permission(request))
        settings = SiteSetting.get_solo()
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request, settings))
