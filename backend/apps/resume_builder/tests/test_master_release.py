from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.portfolio.models import Education, Experience, Project, Skill, SkillCategory
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion
from apps.resume_builder.services import rebuild_and_publish_master, resolve_downloadable_export
from apps.resume_builder.services.canonical import MASTER_POSITIONING
from apps.site_config.models import SiteSetting


class MasterResumeReleaseTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="master-release-owner",
            password="password",
            is_staff=True,
        )
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

        SiteSetting.objects.create(
            owner_name="Shahriyar Khan",
            public_email="shahriyar@example.invalid",
            public_location="Pakistan",
            social_links={
                "github": "https://github.com/Shahriyar-Kh",
                "linkedin": "https://www.linkedin.com/in/shahriyar-kh/",
            },
        )

        category = SkillCategory.objects.create(
            name="Backend",
            slug="backend-master-release",
            display_order=1,
        )
        for order, name in enumerate(("Python", "Django", "PostgreSQL"), start=1):
            Skill.objects.create(
                name=name,
                category=category,
                level=3,
                published=True,
                display_order=order,
            )

        Experience.objects.create(
            company_name="Current Engineering Org",
            role_title="Software Engineer",
            start_date="2026-07-01",
            current_role=True,
            description="Backend-heavy product delivery.",
            achievements=["Built authenticated REST API workflows."],
            status="published",
        )
        Education.objects.create(
            institution="Example University",
            degree="BS Software Engineering",
            start_date="2020-09-01",
            end_date="2024-06-01",
            status="published",
        )

        project_data = (
            (
                "nurses-beyond-borders-nclex-learning-exam-preparation-platform",
                "Nurses Beyond Borders",
            ),
            (
                "yango-wing-fleet-digital-registration-fleet-management-platform",
                "Yango Wing Fleet",
            ),
            (
                "noteassist-ai-productivity-platform",
                "NoteAssist AI",
            ),
        )
        for order, (slug, title) in enumerate(project_data, start=1):
            Project.objects.create(
                slug=slug,
                title=title,
                description=f"{title} verified project description.",
                status="published",
                display_order=order,
            )

    def test_rebuild_publishes_one_default_master_with_downloadable_artifacts(self):
        result = rebuild_and_publish_master(actor=self.owner)
        version = result.version

        self.assertEqual(version.title, MASTER_POSITIONING)
        self.assertEqual(version.status, ResumeVersion.Status.PUBLISHED)
        self.assertTrue(version.is_default)
        self.assertEqual(
            ResumeVersion.objects.filter(
                resume_type=ResumeVersion.ResumeType.MASTER,
                status=ResumeVersion.Status.PUBLISHED,
                is_default=True,
            ).count(),
            1,
        )
        self.assertIsNotNone(resolve_downloadable_export(version, ResumeExport.Format.PDF))
        self.assertIsNotNone(resolve_downloadable_export(version, ResumeExport.Format.DOCX))

        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["document"]["professional_title"], MASTER_POSITIONING)
        self.assertTrue(body["downloads"]["pdf"]["available"])
        self.assertTrue(body["downloads"]["docx"]["available"])

    def test_rebuild_uses_curated_cross_role_projects_and_compact_skill_line(self):
        version = rebuild_and_publish_master(actor=self.owner).version

        self.assertEqual(version.include_projects.count(), 3)
        self.assertEqual(
            set(version.include_skills.values_list("name", flat=True)),
            {"Python", "Django", "PostgreSQL"},
        )
        skill_items = [
            item for item in version.resume_content["items"]
            if item["section"] == "skills"
        ]
        self.assertEqual(len(skill_items), 1)
        self.assertIn("Python", skill_items[0]["text"])
        self.assertIn("Django", skill_items[0]["text"])
        self.assertIn("PostgreSQL", skill_items[0]["text"])

    def test_purge_removes_unreferenced_old_versions_but_preserves_governed_history(self):
        unreferenced = ResumeVersion.objects.create(
            title="Old unreferenced",
            slug="old-unreferenced",
            resume_type=ResumeVersion.ResumeType.TAILORED,
            status=ResumeVersion.Status.ARCHIVED,
        )
        protected = ResumeVersion.objects.create(
            title="Old protected",
            slug="old-protected",
            resume_type=ResumeVersion.ResumeType.TAILORED,
            status=ResumeVersion.Status.ARCHIVED,
        )
        JobApplicationRecord.objects.create(
            organization="Example Employer",
            job_title="Software Engineer",
            resume_version=protected,
        )

        result = rebuild_and_publish_master(actor=self.owner, purge_old=True)

        self.assertIn(unreferenced.pk, result.purged_ids)
        self.assertIn(protected.pk, result.protected_ids)
        self.assertFalse(ResumeVersion.objects.filter(pk=unreferenced.pk).exists())
        self.assertTrue(ResumeVersion.objects.filter(pk=protected.pk).exists())
        self.assertTrue(ResumeVersion.objects.filter(pk=result.version.pk).exists())
