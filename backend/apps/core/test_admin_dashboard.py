from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class AdminDashboardSecurityTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="dashboard-owner",
            password="password",
            is_staff=True,
        )
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

        self.staff = user_model.objects.create_user(
            username="dashboard-staff",
            password="password",
            is_staff=True,
        )

    def test_owner_can_view_dashboard_and_resume_health(self):
        self.client.force_login(self.owner)

        response = self.client.get(reverse("admin_dashboard_summary"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Public Résumé Health")
        self.assertContains(response, "No published default Master résumé")

    def test_non_owner_staff_cannot_view_sensitive_dashboard(self):
        self.client.force_login(self.staff)

        response = self.client.get(reverse("admin_dashboard_summary"))

        self.assertEqual(response.status_code, 403)
