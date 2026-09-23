from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from apps.portfolio.models import Education, Experience, Project, Skill, SkillCategory
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion
from apps.resume_builder.services import (
    approve_version,
    create_master_draft,
    create_tailored_draft,
    generate_resume_export,
    publish_version,
)


class ResumeMaintenanceCommandTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="maintenance-owner",
            password="password",
            is_staff=True,
        )
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

    def _healthy_public_master(self):
        version = create_master_draft(actor=self.owner)
        version = approve_version(version=version, actor=self.owner)
        generate_resume_export(
            resume_version=version,
            format_name="pdf",
            actor=self.owner,
        )
        generate_resume_export(
            resume_version=version,
            format_name="docx",
            actor=self.owner,
        )
        return publish_version(version=version, actor=self.owner)

    def test_rebuild_master_is_dry_run_by_default(self):
        output = StringIO()

        call_command("rebuild_master_resume", stdout=output)

        self.assertEqual(ResumeVersion.objects.count(), 0)
        self.assertIn("DRY RUN", output.getvalue())

    def test_rebuild_master_publishes_current_verified_sources_and_valid_downloads(self):
        Experience.objects.create(
            company_name="Current Employer",
            role_title="Software Engineer",
            start_date="2026-01-01",
            current_role=True,
            status="published",
        )
        Education.objects.create(
            institution="University",
            degree="BS Software Engineering",
            start_date="2021-01-01",
            end_date="2025-01-01",
            status="published",
        )
        category = SkillCategory.objects.create(name="Backend", slug="backend", display_order=1)
        Skill.objects.create(
            name="Python",
            category=category,
            level=Skill.Level.ADVANCED,
            published=True,
            display_order=1,
        )
        for index in range(1, 5):
            Project.objects.create(
                title=f"Verified Project {index}",
                slug=f"verified-project-{index}",
                description="Published evidence.",
                status="published",
                display_order=index,
            )
        output = StringIO()

        call_command("rebuild_master_resume", "--execute", stdout=output)

        version = ResumeVersion.objects.get(
            resume_type=ResumeVersion.ResumeType.MASTER,
            status=ResumeVersion.Status.PUBLISHED,
            is_default=True,
        )
        self.assertEqual(version.include_projects.count(), 3)
        self.assertEqual(version.include_experiences.count(), 1)
        self.assertEqual(version.include_education.count(), 1)
        self.assertEqual(version.include_skills.count(), 1)
        self.assertEqual(
            ResumeExport.objects.filter(
                resume_version=version,
                status=ResumeExport.Status.GENERATED,
            ).count(),
            2,
        )
        self.assertIn("Published healthy canonical Master résumé", output.getvalue())

    def test_audit_command_reports_healthy_current_master(self):
        current = self._healthy_public_master()
        output = StringIO()

        call_command("audit_resume_system", stdout=output)

        rendered = output.getvalue()
        self.assertIn('"public_master_healthy": true', rendered)
        self.assertIn(f'"id": {current.pk}', rendered)
        self.assertIn('"published_default_count": 1', rendered)

    def test_purge_is_dry_run_by_default(self):
        old = create_tailored_draft(
            actor=self.owner,
            title="Old Unused Resume",
            target_role="Backend Engineer",
        )
        self._healthy_public_master()
        output = StringIO()

        call_command("purge_old_resume_versions", stdout=output)

        self.assertTrue(ResumeVersion.objects.filter(pk=old.pk).exists())
        self.assertIn("DRY RUN", output.getvalue())

    def test_execute_purges_unreferenced_versions_but_keeps_application_history(self):
        old = create_tailored_draft(
            actor=self.owner,
            title="Old Unused Resume",
            target_role="Backend Engineer",
        )
        protected = create_tailored_draft(
            actor=self.owner,
            title="Application Resume",
            target_role="Software Engineer",
        )
        JobApplicationRecord.objects.create(
            organization="Example Org",
            job_title="Software Engineer",
            resume_version=protected,
        )
        current = self._healthy_public_master()
        output = StringIO()

        call_command("purge_old_resume_versions", "--execute", stdout=output)

        self.assertFalse(ResumeVersion.objects.filter(pk=old.pk).exists())
        self.assertTrue(ResumeVersion.objects.filter(pk=protected.pk).exists())
        self.assertTrue(ResumeVersion.objects.filter(pk=current.pk).exists())
        self.assertIn("application-referenced", output.getvalue())
