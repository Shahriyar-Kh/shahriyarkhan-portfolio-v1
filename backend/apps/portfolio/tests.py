from datetime import date

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import PublishableModel
from apps.portfolio.models import Experience, Project, Service, Skill, SkillCategory


class PublicPortfolioEndpointsEmptyDatabaseTests(APITestCase):
    """P01A: public read endpoints must return valid JSON, not HTTP 500,
    when the database has no content yet - an empty database is a valid
    business state, not an error."""

    def test_projects_list_returns_200_with_empty_results(self):
        response = self.client.get("/api/v1/public/portfolio/projects/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["results"], [])

    def test_services_list_returns_200_with_empty_results(self):
        response = self.client.get("/api/v1/public/portfolio/services/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["results"], [])

    def test_skills_list_returns_200_with_empty_results(self):
        response = self.client.get("/api/v1/public/portfolio/skills/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["results"], [])

    def test_experiences_list_returns_200_with_empty_results(self):
        response = self.client.get("/api/v1/public/portfolio/experiences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["results"], [])

    def test_education_list_returns_200_with_empty_results(self):
        response = self.client.get("/api/v1/public/portfolio/education/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["results"], [])

    def test_project_detail_unknown_slug_returns_404_not_500(self):
        response = self.client.get("/api/v1/public/portfolio/projects/does-not-exist/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ExperienceEndpointRegistrationTests(APITestCase):
    """P01A: confirms the actual registered endpoint name, and that the
    stale singular path the frontend used to call is not silently
    resolving to something else. See ROUTE_MIGRATION_MAP.csv."""

    def test_plural_experiences_path_is_registered(self):
        response = self.client.get("/api/v1/public/portfolio/experiences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_singular_experience_path_is_not_registered(self):
        response = self.client.get("/api/v1/public/portfolio/experience/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_experiences_url_name_reverses_to_plural_path(self):
        self.assertEqual(reverse("public_experiences"), "/api/v1/public/portfolio/experiences/")


class HiddenDisputedContentExclusionTests(APITestCase):
    """P01A Phase 4: InsightBoard CRM (and any other draft-status project)
    must never appear on a public endpoint, while staying fully visible
    to admin tooling via Project.objects.all()."""

    def setUp(self):
        self.published_project = Project.objects.create(
            title="Genuinely Published Project",
            slug="genuinely-published-project",
            description="A real, verified project.",
            status=Project.Status.PUBLISHED,
        )
        self.hidden_project = Project.objects.create(
            title="InsightBoard CRM - Sales Intelligence Dashboard",
            slug="insightboard-crm-sales-intelligence-dashboard",
            description="Hidden pending verification.",
            status=Project.Status.DRAFT,
            featured=False,
        )

    def test_public_project_list_excludes_draft_insightboard(self):
        response = self.client.get("/api/v1/public/portfolio/projects/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item["slug"] for item in response.json()["results"]]
        self.assertIn(self.published_project.slug, slugs)
        self.assertNotIn(self.hidden_project.slug, slugs)

    def test_public_project_detail_404_for_hidden_insightboard(self):
        response = self.client.get(f"/api/v1/public/portfolio/projects/{self.hidden_project.slug}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_project_detail_200_for_published_project(self):
        response = self.client.get(f"/api/v1/public/portfolio/projects/{self.published_project.slug}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hidden_project_record_is_not_deleted_and_stays_admin_visible(self):
        # Confirms the "hide" is a status flip, not a deletion - the row
        # must still exist and be reachable via the unfiltered admin
        # queryset the AdminProjectViewSet uses.
        self.assertTrue(Project.objects.filter(slug=self.hidden_project.slug).exists())
        self.assertEqual(Project.objects.all().count(), 2)


class ExperienceVisibilityMechanismTests(APITestCase):
    """P01A Phase 4: confirms the existing Experience.status field already
    provides a working publication/visibility gate, so no new field or
    migration is needed to hide a disputed experience record if one is
    ever added to the backend (CognoRise InfoTech currently has no
    backend record at all - see CONTENT_TRUTH_INVENTORY.md)."""

    def setUp(self):
        Experience.objects.create(
            company_name="Verified Employer",
            role_title="Software Developer",
            start_date=date(2025, 6, 1),
            description="A verified role.",
            status=PublishableModel.Status.PUBLISHED,
        )
        Experience.objects.create(
            company_name="Disputed Employer Pending Verification",
            role_title="Intern",
            start_date=date(2024, 10, 1),
            end_date=date(2024, 12, 1),
            description="Dates conflict with another listed role; hidden pending verification.",
            status=PublishableModel.Status.DRAFT,
        )

    def test_public_experience_list_excludes_draft_entries(self):
        response = self.client.get("/api/v1/public/portfolio/experiences/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        companies = [item["company_name"] for item in response.json()["results"]]
        self.assertIn("Verified Employer", companies)
        self.assertNotIn("Disputed Employer Pending Verification", companies)


class NoGenericServerErrorTests(APITestCase):
    """Catch-all regression guard: none of the public GET endpoints P00
    found returning HTTP 500 in production should 500 against a normal
    (empty or minimally seeded) test database."""

    def setUp(self):
        SkillCategory.objects.create(name="Backend", slug="backend", display_order=1)

    def test_representative_public_get_endpoints_never_500(self):
        endpoints = [
            "/api/v1/public/portfolio/projects/",
            "/api/v1/public/portfolio/services/",
            "/api/v1/public/portfolio/skills/",
            "/api/v1/public/portfolio/experiences/",
            "/api/v1/public/portfolio/education/",
            "/api/v1/public/site/settings/",
            "/api/v1/public/resume/default/",
            "/sitemap.xml",
            "/robots.txt",
            "/healthz",
        ]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                response = self.client.get(endpoint)
                self.assertLess(
                    response.status_code,
                    500,
                    f"{endpoint} returned a server error ({response.status_code})",
                )
