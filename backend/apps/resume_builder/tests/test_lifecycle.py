from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, TransactionTestCase

from apps.portfolio.models import Certification, Education, Experience, Project, Skill, SkillCategory
from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import (
    archive_version,
    approve_version,
    create_master_draft,
    create_tailored_draft,
    generate_resume_export,
    publish_version,
    resume_content_hash,
    source_hash,
    update_resume_content,
    validate_generated_export,
)
from apps.resume_builder.services import advance_application_status, mark_application_applied, save_application
from apps.resume_builder.services.exceptions import ApplicationTransitionError, ExportIntegrityError, LifecycleError, MissingExportError, SnapshotValidationError, StaleSnapshotError
from apps.resume_builder.services.drafts import clone_version_to_draft


class LifecycleServiceTests(TransactionTestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(username="lifecycle-owner", is_staff=True)
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

    def _generated_export(self, version, format_name, content=b"artifact"):
        return generate_resume_export(
            resume_version=version,
            format_name=format_name,
            actor=self.owner,
        )

    def _approved_master(self):
        version = create_master_draft()
        approve_version(version=version)
        return ResumeVersion.objects.get(pk=version.pk)

    def test_content_hash_is_deterministic_and_update_rolls_back_on_invalid_content(self):
        version = create_master_draft()
        original = version.resume_content
        self.assertEqual(resume_content_hash(original), version.resume_content_hash)
        invalid = {"items": [{"section": "summary", "text": "bad", "source_claim_ids": ["missing"]}]}
        with self.assertRaises(SnapshotValidationError):
            update_resume_content(version=version, content=invalid)
        version.refresh_from_db()
        self.assertEqual(version.resume_content, original)

    def test_approve_sets_audit_state_and_tailored_approval_succeeds(self):
        master = self._approved_master()
        self.assertEqual(master.status, ResumeVersion.Status.APPROVED)
        tailored = create_tailored_draft(target_role="Engineer")
        approved_tailored = approve_version(version=tailored)
        self.assertEqual(approved_tailored.status, ResumeVersion.Status.APPROVED)
        self.assertFalse(approved_tailored.is_default)

    def test_tailored_publish_fails_and_missing_exports_fail(self):
        tailored = create_tailored_draft()
        approve_version(version=tailored)
        with self.assertRaises(LifecycleError):
            publish_version(version=tailored)
        master = self._approved_master()
        with self.assertRaises(MissingExportError):
            publish_version(version=master)

    def test_publish_requires_valid_pdf_and_docx_and_archives_previous_master(self):
        first = self._approved_master()
        self._generated_export(first, ResumeExport.Format.PDF)
        self._generated_export(first, ResumeExport.Format.DOCX)
        published = publish_version(version=first)
        second = self._approved_master()
        self._generated_export(second, ResumeExport.Format.PDF)
        self._generated_export(second, ResumeExport.Format.DOCX)
        current = publish_version(version=second)
        published.refresh_from_db()
        self.assertEqual(current.status, ResumeVersion.Status.PUBLISHED)
        self.assertEqual(published.status, ResumeVersion.Status.ARCHIVED)
        self.assertFalse(published.is_default)

    def test_export_integrity_rejects_bad_size_or_hash(self):
        version = self._approved_master()
        export = self._generated_export(version, ResumeExport.Format.PDF)
        export.byte_size += 1
        with self.assertRaises(ExportIntegrityError):
            validate_generated_export(export)

    def test_export_integrity_rejects_empty_hash_content_generated_time_and_legacy_formats(self):
        version = self._approved_master()
        for format_name in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
            export = self._generated_export(version, format_name)
            for field, value in (("binary_content", b""), ("sha256", "0" * 64), ("content_hash", "0" * 64), ("generated_at", None)):
                setattr(export, field, value)
                with self.assertRaises(ExportIntegrityError):
                    validate_generated_export(export)
                setattr(export, field, getattr(ResumeExport.objects.get(pk=export.pk), field))
        for format_name in (ResumeExport.Format.JSON, ResumeExport.Format.HTML):
            export = ResumeExport.objects.create(resume_version=version, format=format_name, file="legacy.txt")
            with self.assertRaises(ExportIntegrityError):
                validate_generated_export(export)

    def test_clone_preserves_frozen_content_but_gets_new_identity(self):
        original = create_master_draft()
        clone = clone_version_to_draft(source=original)
        self.assertNotEqual(original.pk, clone.pk)
        self.assertNotEqual(original.version_uuid, clone.version_uuid)
        self.assertEqual(original.source_hash, clone.source_hash)

    def test_application_submission_records_exact_export_and_progression(self):
        version = self._approved_master()
        export = self._generated_export(version, ResumeExport.Format.PDF)
        application = save_application(
            organization="Org",
            job_title="Role",
            resume_version=version,
            status="saved",
        )
        applied = mark_application_applied(application=application, export=export)
        self.assertEqual(applied.status, "applied")
        self.assertEqual(applied.resume_export_id, export.pk)
        self.assertEqual(applied.submitted_artifact_sha256, export.sha256)
        advanced = advance_application_status(application=applied, status="interviewing")
        self.assertEqual(advanced.status, "interviewing")

    def test_application_rejects_mismatched_export_and_terminal_progression(self):
        first = self._approved_master()
        second = self._approved_master()
        export = self._generated_export(first, ResumeExport.Format.PDF)
        application = save_application(organization="Org", job_title="Role", resume_version=second, status="saved")
        with self.assertRaises(ApplicationTransitionError):
            mark_application_applied(application=application, export=export)

    def test_valid_content_update_preserves_source_facts_and_source_hash(self):
        version = create_master_draft(custom_summary="Summary")
        facts = version.source_facts
        digest = version.source_hash
        content = dict(version.resume_content)
        content["items"] = list(content["items"]) + [{"section": "summary", "text": "Summary", "source_claim_ids": [facts["sections"]["custom_summary"][0]["claim_id"]]}]
        updated = update_resume_content(version=version, content=content)
        self.assertEqual(updated.source_facts, facts)
        self.assertEqual(updated.source_hash, digest)
        self.assertEqual(updated.resume_content_hash, resume_content_hash(content))

    def test_stale_source_or_content_hash_blocks_approval(self):
        version = create_master_draft()
        version.source_hash = "0" * 64
        version.save(update_fields=("source_hash",))
        with self.assertRaises(StaleSnapshotError):
            approve_version(version=version)
        version.refresh_from_db()
        version.source_hash = source_hash(version.source_facts)
        version.resume_content_hash = "0" * 64
        version.save(update_fields=("source_hash", "resume_content_hash"))
        with self.assertRaises(StaleSnapshotError):
            approve_version(version=version)

    def test_archive_draft_and_approved_and_published(self):
        draft = create_master_draft()
        self.assertEqual(archive_version(version=draft).status, ResumeVersion.Status.ARCHIVED)
        approved = self._approved_master()
        self.assertEqual(archive_version(version=approved).status, ResumeVersion.Status.ARCHIVED)
        published = self._approved_master()
        self._generated_export(published, ResumeExport.Format.PDF)
        self._generated_export(published, ResumeExport.Format.DOCX)
        publish_version(version=published)
        archived = archive_version(version=published)
        self.assertFalse(archived.is_default)
        with self.assertRaises(LifecycleError):
            archive_version(version=archived)

    def test_all_five_selection_relations_are_immutable_after_snapshot(self):
        category = SkillCategory.objects.create(name="Backend", slug="backend")
        experience = Experience.objects.create(company_name="Org", role_title="Role", start_date="2024-01-01", description="Role", status="published")
        education = Education.objects.create(institution="School", degree="Degree", start_date="2024-01-01", status="published")
        skill = Skill.objects.create(name="Python", category=category)
        project = Project.objects.create(title="Project", slug="project", description="Project", status="published")
        certification = Certification.objects.create(name="Cert", issuer="Issuer", issue_date="2024-01-01", status="published", is_verified=True)
        version = create_master_draft(selections={
            "include_experiences": [experience], "include_education": [education], "include_skills": [skill],
            "include_projects": [project], "include_certifications": [certification],
        })
        for field in ("include_experiences", "include_education", "include_skills", "include_projects", "include_certifications"):
            with self.subTest(field=field):
                with self.assertRaises(ValidationError):
                    getattr(version, field).add(getattr(version, field).first())
