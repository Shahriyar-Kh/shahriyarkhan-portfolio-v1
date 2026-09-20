from datetime import date

from django.test import TestCase

from apps.core.management.commands.sync_canonical_profile_2026 import (
    CANONICAL_LINKEDIN,
    sync_canonical_profile,
)
from apps.core.models import PublishableModel
from apps.portfolio.models import Experience, Project, Service, Skill
from apps.resume_builder.models import ResumeVersion
from apps.site_config.models import SiteSetting


class CanonicalProfileSyncTests(TestCase):
    def test_sync_corrects_public_identity_projects_services_and_employment_history(self):
        Service.objects.create(
            title="Restaurant Website",
            slug="restaurant-website",
            description="Old service.",
            status=PublishableModel.Status.PUBLISHED,
        )
        ResumeVersion.objects.create(
            title="Old Resume",
            slug="old-resume",
            target_role="Junior Full Stack Developer",
            custom_summary="Old public resume",
            is_default=True,
            status=ResumeVersion.Status.PUBLISHED,
            source_facts={
                "profile": {
                    "linkedin": "https://linkedin.com/in/shahriyarkhan786",
                }
            },
        )

        sync_canonical_profile()

        site = SiteSetting.get_solo()
        self.assertEqual(site.social_links["linkedin"], CANONICAL_LINKEDIN)
        self.assertEqual(site.public_location, "Pakistan")
        self.assertEqual(site.public_phone, "")

        ha = Experience.objects.get(
            company_name="HA Technologies (Pvt) Ltd",
            role_title="Software Developer",
        )
        self.assertEqual(ha.start_date, date(2025, 7, 1))
        self.assertEqual(ha.end_date, date(2026, 4, 30))
        self.assertFalse(ha.current_role)

        tricore = Experience.objects.get(company_name="TriCore Digital Tech")
        self.assertEqual(tricore.role_title, "Software Engineer (Contract)")
        self.assertEqual(tricore.start_date, date(2026, 7, 1))
        self.assertTrue(tricore.current_role)

        yango = Project.objects.get(
            slug="yango-wing-fleet-digital-registration-fleet-management-platform"
        )
        self.assertEqual(
            yango.github_url,
            "https://github.com/Shahriyar-Kh/yango-wing-fleet",
        )

        sk = Project.objects.get(slug="sk-learntrack-ai-learning-platform")
        self.assertIn("Groq-powered", sk.description)
        self.assertNotIn("OpenAI-powered", sk.description)

        nbb = Project.objects.get(
            slug="nurses-beyond-borders-nclex-learning-exam-preparation-platform"
        )
        self.assertTrue(nbb.featured)
        self.assertIn("case-studies/nbb-lms.md", nbb.github_url)

        published_services = set(
            Service.objects.filter(status=PublishableModel.Status.PUBLISHED)
            .values_list("slug", flat=True)
        )
        self.assertEqual(
            published_services,
            {
                "custom-software-development",
                "web-development",
                "application-development",
                "saas-development",
                "database-development",
                "cloud-application-development",
            },
        )
        self.assertEqual(
            Service.objects.get(slug="restaurant-website").status,
            PublishableModel.Status.DRAFT,
        )

        self.assertFalse(Skill.objects.filter(published=True, level=4).exists())

        stale_resume = ResumeVersion.objects.get(slug="old-resume")
        self.assertEqual(stale_resume.status, ResumeVersion.Status.ARCHIVED)
        self.assertFalse(stale_resume.is_default)

    def test_verified_tricore_start_date_creates_only_current_role(self):
        sync_canonical_profile(tricore_start_date=date(2026, 7, 1))

        tricore = Experience.objects.get(company_name="TriCore Digital Tech")
        self.assertEqual(tricore.role_title, "Software Engineer (Contract)")
        self.assertEqual(tricore.start_date, date(2026, 7, 1))
        self.assertIsNone(tricore.end_date)
        self.assertTrue(tricore.current_role)

        self.assertFalse(
            Experience.objects.exclude(pk=tricore.pk).filter(current_role=True).exists()
        )

    def test_existing_tricore_date_is_corrected_to_verified_canonical_month(self):
        existing = Experience.objects.create(
            company_name="TriCore Digital Tech",
            role_title="Software Engineer",
            start_date=date(2026, 8, 1),
            current_role=True,
            status=PublishableModel.Status.PUBLISHED,
        )

        sync_canonical_profile()

        existing.refresh_from_db()
        self.assertEqual(existing.role_title, "Software Engineer (Contract)")
        self.assertEqual(existing.start_date, date(2026, 7, 1))
        self.assertTrue(existing.current_role)
