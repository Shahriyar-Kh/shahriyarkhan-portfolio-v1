from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.portfolio.models import Certification, Education, Experience, Project, Skill, SkillCategory
from apps.resume_builder.api.serializers import PublicResumeVersionSerializer, build_public_resume_document
from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import approve_version, create_master_draft, generate_resume_export, publish_version
from apps.resume_builder.services.exports.validation import extract_artifact_text
from apps.site_config.models import SiteSetting


class PublishedSnapshotIsSourceOfTruthTests(APITestCase):
    """B7-RC correction 1: once published, the public API/page must show
    the immutable approved snapshot - never a live re-read of SiteSetting
    or the selected Project/Experience/Education/Skill/Certification
    rows. Builds a résumé through the REAL create_master_draft pipeline
    (real selected live rows), publishes it, then mutates every one of
    those live sources and every SiteSetting field afterward."""

    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="parity-owner", password="password", is_staff=True)
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

        self.site = SiteSetting.get_solo()
        self.site.owner_name = "Original Owner Name"
        self.site.public_email = "original@example.invalid"
        self.site.public_location = "Original City"
        self.site.social_links = {"github": "https://github.example.invalid/original"}
        self.site.save()

        category = SkillCategory.objects.create(name="Backend", slug="backend-parity")
        self.skill = Skill.objects.create(name="Original Skill Name", category=category, level=4, published=True)
        self.experience = Experience.objects.create(
            company_name="Original Company",
            role_title="Original Role",
            start_date="2021-01-01",
            current_role=True,
            description="Original description.",
            achievements=["Original measurable achievement."],
            status="published",
        )
        self.education = Education.objects.create(
            institution="Original University", degree="Original Degree", start_date="2016-09-01", end_date="2020-06-01", status="published",
        )
        self.project = Project.objects.create(
            title="Original Project Title", slug="original-project-parity", description="Original project description.", status="published",
        )
        self.certification = Certification.objects.create(
            name="Original Certification Name", issuer="Original Institute", issue_date="2024-01-01", is_verified=True, status="published",
        )

        version = create_master_draft(
            actor=self.owner,
            custom_summary="Original custom summary sentence.",
            selections={
                "include_skills": [self.skill],
                "include_experiences": [self.experience],
                "include_education": [self.education],
                "include_projects": [self.project],
                "include_certifications": [self.certification],
            },
        )
        version = approve_version(version=version, actor=self.owner)
        generate_resume_export(resume_version=version, format_name="pdf", actor=self.owner)
        generate_resume_export(resume_version=version, format_name="docx", actor=self.owner)
        self.version = publish_version(version=version, actor=self.owner)

    def _get_default(self):
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.json()

    def _mutate_every_live_source(self):
        self.site.owner_name = "Changed Live Owner"
        self.site.public_email = "changed@example.invalid"
        self.site.public_location = "Changed City"
        self.site.social_links = {"github": "https://github.example.invalid/changed"}
        self.site.save()

        self.skill.name = "Changed Skill Name"
        self.skill.save(update_fields=("name",))
        self.experience.role_title = "Changed Role Title"
        self.experience.company_name = "Changed Company"
        self.experience.achievements = ["Changed achievement text entirely."]
        self.experience.save(update_fields=("role_title", "company_name", "achievements"))
        self.education.institution = "Changed University"
        self.education.degree = "Changed Degree"
        self.education.save(update_fields=("institution", "degree"))
        self.project.title = "Changed Project Title"
        self.project.description = "Changed project description entirely."
        self.project.save(update_fields=("title", "description"))
        self.certification.name = "Changed Certification Name"
        self.certification.issuer = "Changed Institute"
        self.certification.save(update_fields=("name", "issuer"))

    def test_document_and_legacy_fields_are_unaffected_by_live_source_changes(self):
        before = self._get_default()
        self._mutate_every_live_source()
        after = self._get_default()

        self.assertEqual(after["document"], before["document"])
        # The legacy live-sourced fields ARE allowed to drift (kept only
        # for response-shape compatibility) - but the safe `document` DTO
        # must never reflect them.
        rendered_text = str(after["document"])
        for changed in ("Changed Live Owner", "Changed Skill Name", "Changed Role Title", "Changed Company", "Changed University", "Changed Degree", "Changed Project Title", "Changed Certification Name", "Changed Institute", "changed@example.invalid", "Changed City"):
            self.assertNotIn(changed, rendered_text)

    def test_document_contains_the_originally_approved_facts(self):
        body = self._get_default()
        rendered_text = str(body["document"])
        self.assertIn("Original Owner Name", rendered_text)
        self.assertIn("Original Skill Name", rendered_text)
        self.assertIn("Original Role", rendered_text)
        self.assertIn("Original Company", rendered_text)
        self.assertIn("Original University", rendered_text)
        self.assertIn("Original Project Title", rendered_text)
        self.assertIn("Original Certification Name", rendered_text)

    def test_document_recursively_excludes_provenance_hashes_and_governance(self):
        self._mutate_every_live_source()
        body = self._get_default()
        raw = str(body)
        for forbidden in ("claim_id", "source_claim_ids", "provenance", "source_facts", "resume_content_hash", "source_hash", "approved_by", "published_by", "created_by", "version_uuid"):
            self.assertNotIn(forbidden, raw)

    def test_document_has_no_raw_resume_content_key(self):
        body = self._get_default()
        self.assertNotIn("resume_content", body)
        self.assertNotIn("positioning", body["document"])

    def test_pdf_docx_and_document_retain_equivalent_text_and_section_order(self):
        self._mutate_every_live_source()
        body = self._get_default()
        document = body["document"]

        pdf_export = ResumeExport.objects.get(resume_version=self.version, format="pdf")
        docx_export = ResumeExport.objects.get(resume_version=self.version, format="docx")
        pdf_text = " ".join(extract_artifact_text(format_name="pdf", artifact=bytes(pdf_export.binary_content)).split())
        docx_text = " ".join(extract_artifact_text(format_name="docx", artifact=bytes(docx_export.binary_content)).split())

        markers = [document["name"], document["professional_title"]]
        for contact in document["contacts"]:
            markers.extend(segment["text"] for segment in contact)
        for section in document["sections"]:
            markers.append(section["heading"])
            for item in section["items"]:
                markers.extend(segment["text"] for segment in item)

        for text in (pdf_text, docx_text):
            cursor = 0
            for marker in markers:
                normalized = " ".join(marker.split())
                if not normalized:
                    continue
                position = text.find(normalized, cursor)
                self.assertGreaterEqual(position, 0, f"{marker!r} not found in order")
                cursor = position + len(normalized)

    def test_default_resume_response_sets_safe_current_master_cache_headers(self):
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertIn("public", response["Cache-Control"])
        self.assertIn("no-cache", response["Cache-Control"])
        self.assertIn("must-revalidate", response["Cache-Control"])
        self.assertTrue(response["ETag"].startswith('"') and response["ETag"].endswith('"'))
        self.assertNotIn("resume_content_hash", response.json())

    def test_etag_changes_when_the_published_document_changes_but_not_when_only_live_sources_change(self):
        first_etag = self.client.get("/api/v1/public/resume/default/")["ETag"]
        self._mutate_every_live_source()
        second_etag = self.client.get("/api/v1/public/resume/default/")["ETag"]
        self.assertEqual(first_etag, second_etag)

    def test_document_is_none_and_api_stays_safe_when_snapshot_cannot_normalize(self):
        self.version.resume_content = {"positioning": "x", "items": []}
        self.version.save(update_fields=("resume_content",))
        body = self._get_default()
        self.assertIsNone(body["document"])


class BuildPublicResumeDocumentUnitTests(TestCase):
    def test_returns_none_without_raising_for_invalid_snapshot(self):
        version = ResumeVersion(resume_content={"positioning": "", "items": []}, source_facts={})
        self.assertIsNone(build_public_resume_document(version))


class DownloadsFieldMatchesActualDownloadabilityTests(APITestCase):
    """B7-RC correction 3: `downloads.<format>.available` must use the
    exact same resolve_downloadable_export() policy as the download
    endpoint, so a structurally corrupt/stale/pending/failed export
    reports unavailable AND 404s - never one without the other."""

    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="avail-owner", password="password", is_staff=True)
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

    def _claim(self, section, number, field, value):
        return {"claim_id": f"fixture.{section}:{number}:{field}", "value": value, "source": {"model": f"fixture.{section}", "record_id": number, "field": field}}

    def _publish(self, slug, summary_text="A parity-availability summary."):
        from apps.resume_builder.services import resume_content_hash, source_hash
        from django.utils import timezone

        title_claim = self._claim("profile", 1, "professional_title", "Availability Parity Engineer")
        summary_claim = self._claim("custom_summary", 1, "custom_summary", summary_text)
        facts = {"schema_version": 1, "sections": {"profile": [title_claim], "experience": [], "education": [], "skills": [], "projects": [], "certifications": [], "custom_summary": [summary_claim]}, "provenance": {"claim_count": 2, "source": "fixture", "selected_records": []}}
        content = {
            "positioning": "Availability Parity Engineer",
            "items": [
                {"section": "positioning", "text": "Availability Parity Engineer", "source_claim_ids": [title_claim["claim_id"]]},
                {"section": "summary", "text": summary_text, "source_claim_ids": [summary_claim["claim_id"]]},
            ],
        }
        version = ResumeVersion.objects.create(
            title="Availability Parity", slug=slug, status=ResumeVersion.Status.APPROVED,
            source_facts=facts, resume_content=content, source_hash=source_hash(facts), resume_content_hash=resume_content_hash(content),
            approved_at=timezone.now(), approved_by=self.owner,
        )
        generate_resume_export(resume_version=version, format_name="pdf", actor=self.owner)
        generate_resume_export(resume_version=version, format_name="docx", actor=self.owner)
        return publish_version(version=version, actor=self.owner)

    def _downloads(self):
        return self.client.get("/api/v1/public/resume/default/").json()["downloads"]

    def _download_status(self, format_name):
        from django.urls import reverse
        return self.client.get(reverse("public_resume_default_download", args=(format_name,))).status_code

    def test_valid_artifact_is_available_and_downloadable(self):
        self._publish("avail-valid")
        downloads = self._downloads()
        self.assertTrue(downloads["pdf"]["available"])
        self.assertTrue(downloads["docx"]["available"])
        self.assertEqual(self._download_status("pdf"), 200)
        self.assertEqual(self._download_status("docx"), 200)

    def test_structurally_corrupt_export_with_plausible_metadata_is_unavailable_and_404(self):
        import hashlib

        version = self._publish("avail-corrupt")
        export = ResumeExport.objects.get(resume_version=version, format="pdf")
        corrupt = b"not-a-real-pdf-but-plausible-size-and-hash"
        # Metadata (byte_size, sha256) is internally consistent with the
        # corrupt bytes - only the structural re-parse can catch this.
        ResumeExport.objects.filter(pk=export.pk).update(binary_content=corrupt, byte_size=len(corrupt), sha256=hashlib.sha256(corrupt).hexdigest())
        downloads = self._downloads()
        self.assertFalse(downloads["pdf"]["available"])
        self.assertTrue(downloads["docx"]["available"])
        self.assertEqual(self._download_status("pdf"), 404)

    def test_stale_content_hash_is_unavailable_and_404(self):
        version = self._publish("avail-stale")
        export = ResumeExport.objects.get(resume_version=version, format="docx")
        ResumeExport.objects.filter(pk=export.pk).update(content_hash="0" * 64)
        downloads = self._downloads()
        self.assertFalse(downloads["docx"]["available"])
        self.assertEqual(self._download_status("docx"), 404)

    def test_pending_export_is_unavailable_and_404(self):
        version = self._publish("avail-pending")
        export = ResumeExport.objects.get(resume_version=version, format="pdf")
        ResumeExport.objects.filter(pk=export.pk).update(status=ResumeExport.Status.PENDING)
        downloads = self._downloads()
        self.assertFalse(downloads["pdf"]["available"])
        self.assertEqual(self._download_status("pdf"), 404)

    def test_failed_export_is_unavailable_and_404(self):
        version = self._publish("avail-failed")
        export = ResumeExport.objects.get(resume_version=version, format="docx")
        ResumeExport.objects.filter(pk=export.pk).update(status=ResumeExport.Status.FAILED, generation_error="boom")
        downloads = self._downloads()
        self.assertFalse(downloads["docx"]["available"])
        self.assertEqual(self._download_status("docx"), 404)

    def test_only_one_valid_format_reports_only_that_format_available(self):
        version = self._publish("avail-one-format")
        export = ResumeExport.objects.get(resume_version=version, format="docx")
        ResumeExport.objects.filter(pk=export.pk).update(status=ResumeExport.Status.FAILED)
        downloads = self._downloads()
        self.assertTrue(downloads["pdf"]["available"])
        self.assertFalse(downloads["docx"]["available"])

    def test_no_valid_formats_reports_neither_available(self):
        version = self._publish("avail-none")
        ResumeExport.objects.filter(resume_version=version).update(status=ResumeExport.Status.FAILED, generation_error="boom")
        downloads = self._downloads()
        self.assertFalse(downloads["pdf"]["available"])
        self.assertFalse(downloads["docx"]["available"])
        self.assertEqual(self._download_status("pdf"), 404)
        self.assertEqual(self._download_status("docx"), 404)

    def test_json_etag_changes_when_the_published_master_switches(self):
        self._publish("etag-switch-first", summary_text="First distinct summary text.")
        first_etag = self.client.get("/api/v1/public/resume/default/")["ETag"]
        # publish_version() archives the currently-published master
        # automatically (see services.lifecycle.publish_version) - no
        # manual archive step needed here.
        self._publish("etag-switch-second", summary_text="A completely different second summary.")
        second_etag = self.client.get("/api/v1/public/resume/default/")["ETag"]
        self.assertNotEqual(first_etag, second_etag)

    def test_availability_check_never_generates_a_document(self):
        from unittest.mock import patch

        version = self._publish("avail-no-generate")
        with patch.dict("apps.resume_builder.services.exports.orchestration.RENDERERS", {}, clear=True):
            downloads = self._downloads()
        self.assertTrue(downloads["pdf"]["available"])
        self.assertEqual(ResumeExport.objects.filter(resume_version=version).count(), 2)
