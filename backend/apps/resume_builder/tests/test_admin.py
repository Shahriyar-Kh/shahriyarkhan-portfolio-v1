import hashlib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.portfolio.admin import CertificationAdmin
from apps.portfolio.models import Certification, Education, Experience, Project, Skill, SkillCategory
from apps.resume_builder.admin import ResumeExportAdmin, ResumeVersionAdmin
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion
from apps.resume_builder.models import ResumeAssessment
from apps.resume_builder.services import approve_version, create_master_draft, create_tailored_draft
from apps.resume_builder.services.exceptions import SnapshotSourceUnavailable


@override_settings(ADMIN_URL_PATH="admin")
class ResumeAdminWorkflowTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="owner", password="password", is_staff=True)
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))
        self.client.force_login(self.owner)

    def url(self, name, *args):
        return reverse(f"admin:{name}", args=args)

    def test_anonymous_non_owner_and_owner_permissions(self):
        self.client.logout()
        response = self.client.get(self.url("resume_builder_create_draft"))
        self.assertEqual(response.status_code, 302)
        staff = get_user_model().objects.create_user(username="staff", password="password", is_staff=True)
        self.client.force_login(staff)
        self.assertEqual(self.client.get(self.url("resume_builder_create_draft")).status_code, 403)
        self.client.force_login(self.owner)
        self.assertEqual(self.client.get(self.url("resume_builder_create_draft")).status_code, 200)
        superuser = get_user_model().objects.create_superuser(username="super", password="password", email="super@example.com")
        self.client.force_login(superuser)
        self.assertEqual(self.client.get(self.url("resume_builder_create_draft")).status_code, 200)

    def test_create_master_draft_get_post_and_ineligible_selection_absent(self):
        response = self.client.get(self.url("resume_builder_create_draft"))
        self.assertContains(response, "Create Résumé Draft")
        self.assertNotContains(response, "Draft Employer")
        experience = Experience.objects.create(company_name="Published Employer", role_title="Engineer", start_date="2024-01-01", description="Verified", status="published")
        response = self.client.post(self.url("resume_builder_create_draft"), {
            "resume_type": "master",
            "title": "Ignored title",
            "target_role": "",
            "target_organization": "secret org",
            "custom_summary": "Owner summary",
            "experiences": [experience.pk],
        })
        self.assertEqual(response.status_code, 302)
        version = ResumeVersion.objects.get()
        self.assertEqual(version.status, "draft")
        self.assertEqual(version.title, "Software Engineer | Backend Engineer | Python & Django Developer")
        self.assertEqual(version.target_organization, "")
        self.assertEqual(list(version.include_experiences.values_list("pk", flat=True)), [experience.pk])


    def test_new_master_form_preselects_verified_public_sources(self):
        experience = Experience.objects.create(
            company_name="Published Employer",
            role_title="Engineer",
            start_date="2024-01-01",
            description="Verified",
            status="published",
        )
        hidden_experience = Experience.objects.create(
            company_name="Draft Employer",
            role_title="Engineer",
            start_date="2023-01-01",
            description="Draft",
            status="draft",
        )
        education = Education.objects.create(
            institution="Published University",
            degree="BS Software Engineering",
            start_date="2020-01-01",
            status="published",
        )
        category = SkillCategory.objects.create(name="Backend", slug="backend", display_order=1)
        skill = Skill.objects.create(
            name="Django",
            category=category,
            level=Skill.Level.ADVANCED,
            published=True,
            display_order=1,
        )
        projects = [
            Project.objects.create(
                title=f"Project {index}",
                slug=f"project-{index}",
                description="Verified project",
                status="published",
                display_order=index,
            )
            for index in range(1, 5)
        ]
        Certification.objects.create(
            name="Verified Certificate",
            issuer="Issuer",
            issue_date="2026-01-01",
            is_verified=True,
            status="published",
        )

        response = self.client.get(self.url("resume_builder_create_draft"))

        self.assertEqual(response.status_code, 200)
        form = response.context["form"]
        self.assertIn(experience.pk, form.initial["experiences"])
        self.assertNotIn(hidden_experience.pk, form.initial["experiences"])
        self.assertIn(education.pk, form.initial["education"])
        self.assertIn(skill.pk, form.initial["skills"])
        self.assertEqual(form.initial["projects"], [project.pk for project in projects[:3]])
        self.assertEqual(len(form.initial["certifications"]), 1)
        self.assertIn("Python/Django backend engineering", form.initial["custom_summary"])

    def test_invalid_generated_exports_do_not_enable_publish_or_download_controls(self):
        version = approve_version(version=create_master_draft(), actor=self.owner)
        for format_name in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
            bad = b"not-a-valid-artifact"
            ResumeExport.objects.create(
                resume_version=version,
                format=format_name,
                status=ResumeExport.Status.GENERATED,
                content_hash=version.resume_content_hash,
                sha256=hashlib.sha256(bad).hexdigest(),
                binary_content=bad,
                byte_size=len(bad),
                generated_at=timezone.now(),
            )

        response = self.client.get(
            reverse("admin:resume_builder_resumeversion_change", args=(version.pk,))
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, ">Publish<", html=False)
        self.assertNotContains(response, ">Download PDF<", html=False)
        self.assertNotContains(response, ">Download DOCX<", html=False)

    def test_generic_resume_version_add_is_disabled_but_governed_draft_route_remains_available(self):
        self.assertEqual(
            self.client.get(reverse("admin:resume_builder_resumeversion_add")).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(self.url("resume_builder_create_draft")).status_code,
            200,
        )

    def test_tampered_ineligible_selection_is_rejected_without_placeholder(self):
        hidden = Experience.objects.create(company_name="Hidden", role_title="Role", start_date="2024-01-01", description="Hidden", status="draft")
        response = self.client.post(self.url("resume_builder_create_draft"), {"resume_type": "master", "title": "x", "experiences": [hidden.pk]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ResumeVersion.objects.count(), 0)

    def test_tailored_creation_and_get_actions_do_not_mutate(self):
        response = self.client.post(self.url("resume_builder_create_draft"), {
            "resume_type": "tailored", "title": "Tailored", "target_role": "Engineer", "target_organization": "Org", "custom_summary": "Summary",
        })
        self.assertEqual(response.status_code, 302)
        version = ResumeVersion.objects.get()
        before = version.updated_at
        response = self.client.get(self.url("resume_builder_version_action", version.pk, "archive"))
        self.assertEqual(response.status_code, 200)
        version.refresh_from_db()
        self.assertEqual(version.status, "draft")
        self.assertEqual(version.updated_at, before)

    def test_all_mutating_workflow_gets_are_confirmation_only(self):
        version = create_master_draft()
        before = ResumeVersion.objects.count()
        for action in ("clone", "regenerate", "approve", "publish", "archive"):
            with self.subTest(action=action):
                response = self.client.get(self.url("resume_builder_version_action", version.pk, action))
                self.assertEqual(response.status_code, 200)
                self.assertEqual(ResumeVersion.objects.count(), before)

    def test_mutating_workflow_urls_enforce_csrf(self):
        version = create_master_draft()
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.owner)
        urls = [(self.url("resume_builder_version_action", version.pk, action), {}) for action in ("clone", "regenerate", "approve", "publish", "archive")]
        urls.append((self.url("resume_builder_edit_content", version.pk), {}))
        for url, data in urls:
            with self.subTest(url=url):
                self.assertEqual(csrf_client.post(url, data).status_code, 403)
        application = JobApplicationRecord.objects.create(organization="Org", job_title="Role", resume_version=version)
        for url in (self.url("resume_builder_mark_applied", application.pk), self.url("resume_builder_advance_status", application.pk)):
            with self.subTest(url=url):
                self.assertEqual(csrf_client.post(url, {}).status_code, 403)

    def test_content_editor_is_structured_and_preview_escapes_html(self):
        version = create_master_draft(custom_summary="<script>alert(1)</script>")
        response = self.client.get(self.url("resume_builder_edit_content", version.pk))
        self.assertNotContains(response, 'name="source_facts"')
        self.assertNotContains(response, 'name="resume_content"')
        response = self.client.get(self.url("resume_builder_admin_preview", version.pk))
        self.assertContains(response, "&lt;script&gt;alert(1)&lt;/script&gt;")
        self.assertNotContains(response, "<script>alert(1)</script>")

    def test_editor_preserves_provenance_and_factual_source_fields(self):
        version = create_master_draft(custom_summary="Original")
        original_facts, original_hash = version.source_facts, version.source_hash
        original_claims = version.resume_content["items"][0]["source_claim_ids"]
        response = self.client.post(self.url("resume_builder_edit_content", version.pk), {"item_0": "Edited summary"})
        self.assertEqual(response.status_code, 302)
        version.refresh_from_db()
        self.assertEqual(version.source_facts, original_facts)
        self.assertEqual(version.source_hash, original_hash)
        self.assertEqual(version.resume_content["items"][0]["source_claim_ids"], original_claims)

    def test_editor_cannot_change_factual_fields(self):
        version = create_master_draft(custom_summary="Original")
        original = version.resume_content
        response = self.client.post(self.url("resume_builder_edit_content", version.pk), {"employer": "Tampered", "role": "Tampered", "dates": "Tampered", "skill": "Tampered"})
        self.assertEqual(response.status_code, 200)
        version.refresh_from_db()
        self.assertEqual(version.resume_content, original)

    def test_invalid_editor_edit_rolls_back_and_approved_editor_is_denied(self):
        version = create_master_draft(custom_summary="Original")
        original = version.resume_content
        response = self.client.post(self.url("resume_builder_edit_content", version.pk), {"tampered": "Employer"})
        self.assertEqual(response.status_code, 200)
        version.refresh_from_db()
        self.assertEqual(version.resume_content, original)
        version.status = ResumeVersion.Status.APPROVED
        version.save(update_fields=("status",))
        self.assertEqual(self.client.get(self.url("resume_builder_edit_content", version.pk)).status_code, 403)

    def test_preview_reports_current_changed_and_unavailable_freshness(self):
        current = create_master_draft()
        self.assertContains(self.client.get(self.url("resume_builder_admin_preview", current.pk)), "Freshness: current")
        from apps.site_config.models import SiteSetting
        SiteSetting.objects.create(owner_name="Owner")
        changed = create_master_draft()
        SiteSetting.objects.update(owner_name="Changed")
        self.assertContains(self.client.get(self.url("resume_builder_admin_preview", changed.pk)), "Freshness: changed")
        experience = Experience.objects.create(company_name="Org", role_title="Role", start_date="2024-01-01", description="Role", status="published")
        unavailable = create_master_draft(selections={"include_experiences": [experience]})
        experience.delete()
        self.assertContains(self.client.get(self.url("resume_builder_admin_preview", unavailable.pk)), "Freshness: unavailable")

    def test_unknown_content_field_is_rejected_and_content_unchanged(self):
        version = create_master_draft(custom_summary="Original")
        response = self.client.post(self.url("resume_builder_edit_content", version.pk), {"item_0": "Changed", "tampered": "Employer"})
        self.assertEqual(response.status_code, 200)
        version.refresh_from_db()
        self.assertIn("Original", str(version.resume_content))

    def test_clone_and_regenerate_actions_use_post_and_preserve_original(self):
        version = create_master_draft()
        response = self.client.post(self.url("resume_builder_version_action", version.pk, "clone"))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(ResumeVersion.objects.count(), 2)
        response = self.client.post(self.url("resume_builder_version_action", version.pk, "regenerate"))
        self.assertEqual(response.status_code, 302)
        self.assertEqual(ResumeVersion.objects.count(), 3)
        version.refresh_from_db()
        self.assertEqual(version.status, "draft")

    def test_regenerate_failure_creates_no_partial_row(self):
        experience = Experience.objects.create(company_name="Org", role_title="Role", start_date="2024-01-01", description="Role", status="published")
        version = create_master_draft(selections={"include_experiences": [experience]})
        experience.delete()
        with self.assertRaises(SnapshotSourceUnavailable):
            from apps.resume_builder.services import regenerate_from_current_portfolio
            regenerate_from_current_portfolio(source=version)
        self.assertEqual(ResumeVersion.objects.count(), 1)

    def test_approve_uses_lifecycle_service_and_publish_requires_both_exports(self):
        version = create_master_draft()
        with patch("apps.resume_builder.admin_workflow.approve_version", wraps=__import__("apps.resume_builder.services", fromlist=["approve_version"]).approve_version) as mocked:
            response = self.client.post(self.url("resume_builder_version_action", version.pk, "approve"))
            self.assertEqual(response.status_code, 302)
            self.assertTrue(mocked.called)
        version.refresh_from_db()
        response = self.client.post(self.url("resume_builder_version_action", version.pk, "publish"), follow=True)
        self.assertNotContains(response, "Traceback")
        version.refresh_from_db()
        self.assertEqual(version.status, ResumeVersion.Status.APPROVED)

    def test_archive_post_updates_correct_version(self):
        version = create_master_draft()
        response = self.client.post(self.url("resume_builder_version_action", version.pk, "archive"))
        self.assertEqual(response.status_code, 302)
        version.refresh_from_db()
        self.assertEqual(version.status, ResumeVersion.Status.ARCHIVED)

    def test_approved_version_cannot_be_deleted(self):
        version = create_master_draft()
        version.status = "approved"
        version.save(update_fields=("status",))
        response = self.client.post(reverse("admin:resume_builder_resumeversion_delete", args=(version.pk,)), {"post": "yes"})
        self.assertIn(response.status_code, (403, 404))
        self.assertTrue(ResumeVersion.objects.filter(pk=version.pk).exists())

    def test_unsafe_bulk_actions_and_protected_export_html_are_absent(self):
        self.assertFalse(ResumeVersionAdmin.actions)
        self.assertFalse(ResumeExportAdmin(ResumeExport, None).has_add_permission(None))
        self.assertFalse(ResumeExportAdmin(ResumeExport, None).has_change_permission(None))
        version = create_master_draft()
        export = ResumeExport.objects.create(resume_version=version, format="pdf", binary_content=b"SECRET")
        response = self.client.get(reverse("admin:resume_builder_resumeexport_changelist"))
        self.assertNotContains(response, "SECRET")
        queryset = ResumeExportAdmin(ResumeExport, None).get_queryset(None)
        self.assertIn("binary_content", queryset.get(pk=export.pk).get_deferred_fields())

    def test_application_admin_creation_submission_and_status_progression(self):
        version = create_master_draft()
        response = self.client.post(reverse("admin:resume_builder_jobapplicationrecord_add"), {"organization": "Org", "job_title": "Role", "resume_version": version.pk, "status": "saved"})
        self.assertEqual(response.status_code, 302)
        application = JobApplicationRecord.objects.get()
        self.assertEqual(application.status, "draft")
        response = self.client.post(self.url("resume_builder_advance_status", application.pk), {"status": "interviewing"})
        self.assertIn(response.status_code, (302, 403))

    def test_job_match_confirmation_resolves_application_resume_not_same_numeric_resume_pk(self):
        create_master_draft()
        target = create_tailored_draft(
            title="Application Target Resume",
            target_role="Backend Engineer",
            target_organization="Example Org",
        )
        application = JobApplicationRecord.objects.create(
            organization="Example Org",
            job_title="Backend Engineer",
            resume_version=target,
        )

        response = self.client.get(
            self.url("resume_builder_ats_job_match", application.pk)
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Application Target Resume")

    def test_application_fields_after_applied_are_read_only_and_routes_are_private(self):
        version = create_master_draft()
        application = JobApplicationRecord.objects.create(organization="Org", job_title="Role", resume_version=version, status="applied")
        response = self.client.get(reverse("admin:resume_builder_jobapplicationrecord_change", args=(application.pk,)))
        self.assertNotContains(response, 'name="organization"')
        self.assertEqual(self.client.get("/api/v1/public/resume/applications/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/public/resume/tailored-slug/").status_code, 404)

    def test_certification_admin_fields_filters_and_search_are_present(self):
        self.assertEqual(CertificationAdmin.list_display, ("name", "issuer", "issue_date", "expiry_date", "is_verified", "status"))
        self.assertIn("is_verified", CertificationAdmin.list_filter)
        self.assertIn("credential_id", CertificationAdmin.search_fields)

    def test_ats_readiness_get_is_confirmation_and_post_creates_history(self):
        version = create_master_draft()
        get_response = self.client.get(self.url("resume_builder_ats_readiness", version.pk))
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(ResumeAssessment.objects.count(), 0)
        post_response = self.client.post(self.url("resume_builder_ats_readiness", version.pk))
        self.assertEqual(post_response.status_code, 302)
        self.assertEqual(ResumeAssessment.objects.count(), 1)
        self.assertEqual(ResumeAssessment.objects.get().assessment_type, "readiness")

    def test_ats_readiness_requires_csrf(self):
        version = create_master_draft()
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.owner)
        self.assertEqual(csrf_client.post(self.url("resume_builder_ats_readiness", version.pk)).status_code, 403)
