import hashlib
from unittest.mock import patch

from django.test import Client
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.analytics_app.models import AnalyticsEvent
from apps.resume_builder.api.serializers import PublicResumeVersionSerializer
from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import approve_version, generate_resume_export, publish_version, resume_content_hash, source_hash


class PublicResumeDeliveryTestCase(APITestCase):
    """Shared fixture builder for B7's public delivery layer: a real
    approved master, exported through the real B6 pipeline (so the
    bytes served here are byte-identical to what the private Admin
    generates), then published through the real lifecycle service."""

    def setUp(self):
        user_model = __import__("django.contrib.auth", fromlist=["get_user_model"]).get_user_model()
        self.owner = user_model.objects.create_user(username="delivery-owner", password="password", is_staff=True)
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))

    def _claim(self, section, number, field, value):
        return {
            "claim_id": f"fixture.{section}:{number}:{field}",
            "value": value,
            "source": {"model": f"fixture.{section}", "record_id": number, "field": field},
        }

    def _version(self, *, slug, resume_type="master", status=ResumeVersion.Status.APPROVED, is_default=False, summary_text="A concise evidence-led summary."):
        section_values = {
            "profile": (
                ("owner_name", "Morgan Reed"),
                ("professional_title", "Python & Django Software Engineer"),
                ("public_email", "morgan@example.invalid"),
            ),
            "custom_summary": (("custom_summary", summary_text),),
            "skills": (("name", "Python, Django, PostgreSQL"),),
            "experience": (("achievement", "Reduced verified processing time by 35% with measured automation."),),
        }
        sections = {key: [] for key in ("profile", "experience", "education", "skills", "projects", "certifications", "custom_summary")}
        content_items = []
        for section, entries in section_values.items():
            for number, (field, value) in enumerate(entries, start=1):
                claim = self._claim(section, number, field, value)
                sections[section].append(claim)
                content_section = "summary" if section == "custom_summary" else section
                if section == "profile" and field == "professional_title":
                    content_section = "positioning"
                elif section == "profile" and field not in {"owner_name", "professional_title"}:
                    content_section = "contact"
                content_items.append({"section": content_section, "text": value, "source_claim_ids": [claim["claim_id"]]})
        facts = {"schema_version": 1, "sections": sections, "provenance": {"claim_count": len(content_items), "source": "synthetic_test_fixture", "selected_records": []}}
        content = {"positioning": "Python & Django Software Engineer", "items": content_items}
        return ResumeVersion.objects.create(
            title="Software Engineer | Python & Django Full-Stack Developer",
            slug=slug,
            resume_type=resume_type,
            status=status,
            is_default=is_default,
            source_facts=facts,
            resume_content=content,
            source_hash=source_hash(facts),
            resume_content_hash=resume_content_hash(content),
            approved_at=timezone.now(),
            approved_by=self.owner,
        )

    def _publish_master(self, *, slug, summary_text="A concise evidence-led summary."):
        version = self._version(slug=slug, summary_text=summary_text)
        generate_resume_export(resume_version=version, format_name="pdf", actor=self.owner)
        generate_resume_export(resume_version=version, format_name="docx", actor=self.owner)
        return publish_version(version=version, actor=self.owner)


class PublicDefaultResumeContractTests(PublicResumeDeliveryTestCase):
    def test_default_returns_only_the_published_default_master(self):
        published = self._publish_master(slug="published-master")
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["slug"], published.slug)

    def test_404_when_only_non_default_publishable_records_exist(self):
        self._version(slug="draft-only", status=ResumeVersion.Status.DRAFT)
        self._version(slug="approved-only", status=ResumeVersion.Status.APPROVED)
        self._version(slug="tailored-only", resume_type=ResumeVersion.ResumeType.TAILORED, status=ResumeVersion.Status.APPROVED)
        archived = self._version(slug="archived-only", status=ResumeVersion.Status.DRAFT)
        archived.status = ResumeVersion.Status.ARCHIVED
        archived.save(update_fields=("status",))
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_slug_route_only_ever_exposes_a_published_master(self):
        published = self._publish_master(slug="slug-published-master")
        tailored = self._version(slug="slug-tailored", resume_type=ResumeVersion.ResumeType.TAILORED, status=ResumeVersion.Status.APPROVED)
        draft = self._version(slug="slug-draft", status=ResumeVersion.Status.DRAFT)

        ok = self.client.get(f"/api/v1/public/resume/{published.slug}/")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(f"/api/v1/public/resume/{tailored.slug}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/v1/public/resume/{draft.slug}/").status_code, status.HTTP_404_NOT_FOUND)

    def test_serializer_never_exposes_source_facts_provenance_or_governance(self):
        published = self._publish_master(slug="contract-master")
        response = self.client.get("/api/v1/public/resume/default/")
        body = response.json()
        for forbidden in ("source_facts", "resume_content", "source_claim_ids", "source_hash", "resume_content_hash", "version_uuid", "approved_by", "published_by", "created_by", "resume_type", "status"):
            self.assertNotIn(forbidden, body)
        # Only an availability flag, never the artifact bytes or a hash.
        self.assertEqual(set(body["downloads"]), {"pdf", "docx"})
        self.assertEqual(set(body["downloads"]["pdf"]), {"available"})
        self.assertTrue(body["downloads"]["pdf"]["available"])
        self.assertTrue(body["downloads"]["docx"]["available"])

    def test_downloads_unavailable_before_export_generation(self):
        version = self._version(slug="no-export-master", status=ResumeVersion.Status.APPROVED, is_default=False)
        version.status = ResumeVersion.Status.PUBLISHED
        version.is_default = True
        version.published_at = timezone.now()
        version.save(update_fields=("status", "is_default", "published_at"))
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertFalse(body["downloads"]["pdf"]["available"])
        self.assertFalse(body["downloads"]["docx"]["available"])

    def test_private_application_and_assessment_routes_remain_unroutable(self):
        self.assertEqual(self.client.get("/api/v1/public/resume/applications/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/public/resume/assessments/").status_code, 404)

    def test_admin_resume_routes_remain_protected(self):
        self.assertIn(self.client.get("/api/v1/admin/resume/versions/").status_code, (401, 403))


class PublicResumeDownloadTests(PublicResumeDeliveryTestCase):
    def _download_url(self, format_name):
        return reverse("public_resume_default_download", args=(format_name,))

    def test_pdf_and_docx_downloads_return_exact_stored_bytes(self):
        published = self._publish_master(slug="exact-bytes-master")
        for format_name in ("pdf", "docx"):
            export = ResumeExport.objects.get(resume_version=published, format=format_name)
            response = self.client.get(self._download_url(format_name))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.content, bytes(export.binary_content))
            self.assertEqual(hashlib.sha256(response.content).hexdigest(), export.sha256)

    def test_headers_are_correct_and_filenames_are_server_generated(self):
        published = self._publish_master(slug="headers-master")
        response = self.client.get(self._download_url("pdf"))
        export = ResumeExport.objects.get(resume_version=published, format="pdf")
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertEqual(response["Content-Disposition"], f'attachment; filename="resume-{published.version_uuid.hex}.pdf"')
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertIn("public", response["Cache-Control"])
        self.assertIn("no-cache", response["Cache-Control"])
        self.assertIn("must-revalidate", response["Cache-Control"])
        self.assertEqual(response["Content-Length"], str(export.byte_size))
        self.assertNotIn(published.slug, response["Content-Disposition"])
        self.assertNotIn("resume_exports/", response["Content-Disposition"])

    def test_head_returns_headers_without_a_body(self):
        self._publish_master(slug="head-master")
        get_response = self.client.get(self._download_url("docx"))
        head_response = self.client.head(self._download_url("docx"))
        self.assertEqual(head_response.status_code, status.HTTP_200_OK)
        self.assertEqual(head_response.content, b"")
        self.assertEqual(head_response["Content-Length"], get_response["Content-Length"])
        self.assertEqual(head_response["ETag"], get_response["ETag"])
        self.assertEqual(head_response["Content-Type"], get_response["Content-Type"])

    def test_matching_etag_returns_304_with_no_body_and_non_matching_returns_200(self):
        self._publish_master(slug="etag-master")
        url = self._download_url("pdf")
        first = self.client.get(url)
        etag = first["ETag"]
        self.assertTrue(etag.startswith('"') and etag.endswith('"'))

        revalidated = self.client.get(url, HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(revalidated.status_code, status.HTTP_304_NOT_MODIFIED)
        self.assertEqual(revalidated.content, b"")
        self.assertEqual(revalidated["ETag"], etag)

        stale = self.client.get(url, HTTP_IF_NONE_MATCH='"not-the-real-etag"')
        self.assertEqual(stale.status_code, status.HTTP_200_OK)
        self.assertEqual(stale.content, first.content)

    def test_switching_the_published_master_changes_etag_and_bytes(self):
        first = self._publish_master(slug="rotation-first", summary_text="First summary text for rotation.")
        url = self._download_url("pdf")
        before = self.client.get(url)

        second = self._publish_master(slug="rotation-second", summary_text="A completely different second summary.")
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, ResumeVersion.Status.ARCHIVED)
        self.assertTrue(second.is_default)

        after = self.client.get(url)
        self.assertEqual(after.status_code, status.HTTP_200_OK)
        self.assertNotEqual(after["ETag"], before["ETag"])
        self.assertNotEqual(after.content, before.content)
        second_export = ResumeExport.objects.get(resume_version=second, format="pdf")
        self.assertEqual(after.content, bytes(second_export.binary_content))

    def test_tailored_and_historical_exports_are_never_served_by_the_default_route(self):
        published = self._publish_master(slug="current-default")
        tailored = self._version(
            slug="tailored-never-public",
            resume_type=ResumeVersion.ResumeType.TAILORED,
            status=ResumeVersion.Status.APPROVED,
            summary_text="A distinctly different tailored-only summary that must never be publicly served.",
        )
        generate_resume_export(resume_version=tailored, format_name="pdf", actor=self.owner)

        response = self.client.get(self._download_url("pdf"))
        current_export = ResumeExport.objects.get(resume_version=published, format="pdf")
        tailored_export = ResumeExport.objects.get(resume_version=tailored, format="pdf")
        self.assertEqual(response.content, bytes(current_export.binary_content))
        self.assertNotEqual(response.content, bytes(tailored_export.binary_content))

    def test_404_when_no_published_master_or_no_export_or_wrong_format(self):
        self.assertEqual(self.client.get(self._download_url("pdf")).status_code, status.HTTP_404_NOT_FOUND)
        self._version(slug="approved-not-published", status=ResumeVersion.Status.APPROVED)
        self.assertEqual(self.client.get(self._download_url("pdf")).status_code, status.HTTP_404_NOT_FOUND)
        published = self._publish_master(slug="only-generated-pdf-and-docx")
        self.assertEqual(self.client.get(reverse("public_resume_default_download", args=("json",))).status_code, status.HTTP_404_NOT_FOUND)

    def test_corrupt_stale_pending_and_failed_exports_are_rejected(self):
        published = self._publish_master(slug="integrity-master")
        export = ResumeExport.objects.get(resume_version=published, format="pdf")
        url = self._download_url("pdf")

        ResumeExport.objects.filter(pk=export.pk).update(binary_content=b"not-a-pdf", byte_size=9, sha256=hashlib.sha256(b"not-a-pdf").hexdigest())
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

        ResumeExport.objects.filter(pk=export.pk).update(
            binary_content=export.binary_content, byte_size=export.byte_size, sha256=export.sha256, content_hash="0" * 64,
        )
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

        ResumeExport.objects.filter(pk=export.pk).update(content_hash=export.content_hash, status=ResumeExport.Status.PENDING)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

        ResumeExport.objects.filter(pk=export.pk).update(status=ResumeExport.Status.FAILED, generation_error="boom")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

        ResumeExport.objects.filter(pk=export.pk).update(status=ResumeExport.Status.GENERATED, generation_error="")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_public_download_never_generates_a_document(self):
        self._publish_master(slug="never-generate-master")
        with patch.dict("apps.resume_builder.services.exports.orchestration.RENDERERS", {}, clear=True):
            response = self.client.get(self._download_url("pdf"))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            head_response = self.client.head(self._download_url("docx"))
            self.assertEqual(head_response.status_code, status.HTTP_200_OK)
        self.assertEqual(ResumeExport.objects.count(), 2)

    def test_get_head_and_write_methods_behave_safely(self):
        self._publish_master(slug="methods-master")
        url = self._download_url("pdf")
        self.assertEqual(self.client.post(url).status_code, 405)
        self.assertEqual(self.client.put(url).status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)


class DownloadTrackingTests(PublicResumeDeliveryTestCase):
    def _download_url(self, format_name):
        return reverse("public_resume_default_download", args=(format_name,))

    def _download_event_count(self):
        return AnalyticsEvent.objects.filter(event_type=AnalyticsEvent.EventType.RESUME_DOWNLOAD).count()

    def test_successful_get_is_tracked_exactly_once(self):
        self._publish_master(slug="tracked-get-master")
        before = self._download_event_count()
        self.client.get(self._download_url("pdf"))
        self.assertEqual(self._download_event_count(), before + 1)

    def test_head_is_never_tracked(self):
        self._publish_master(slug="tracked-head-master")
        before = self._download_event_count()
        self.client.head(self._download_url("pdf"))
        self.assertEqual(self._download_event_count(), before)

    def test_304_is_never_tracked(self):
        self._publish_master(slug="tracked-304-master")
        url = self._download_url("pdf")
        etag = self.client.get(url)["ETag"]
        before = self._download_event_count()
        response = self.client.get(url, HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(response.status_code, status.HTTP_304_NOT_MODIFIED)
        self.assertEqual(self._download_event_count(), before)

    def test_404_and_rejected_exports_are_never_tracked(self):
        before = self._download_event_count()
        self.client.get(self._download_url("pdf"))  # no published master yet
        self.assertEqual(self._download_event_count(), before)

        published = self._publish_master(slug="tracked-rejection-master")
        export = ResumeExport.objects.get(resume_version=published, format="pdf")
        ResumeExport.objects.filter(pk=export.pk).update(binary_content=b"bad", byte_size=3, sha256=hashlib.sha256(b"bad").hexdigest())
        before = self._download_event_count()
        self.client.get(self._download_url("pdf"))
        self.assertEqual(self._download_event_count(), before)

    def test_repeated_downloads_are_not_double_counted_per_request(self):
        self._publish_master(slug="no-double-count-master")
        url = self._download_url("pdf")
        before = self._download_event_count()
        self.client.get(url)
        self.client.get(url)
        self.assertEqual(self._download_event_count(), before + 2)

    def test_legacy_route_tracks_only_a_published_master_slug(self):
        published = self._publish_master(slug="legacy-track-master")
        draft = self._version(slug="legacy-track-draft", status=ResumeVersion.Status.DRAFT)
        tailored = self._version(slug="legacy-track-tailored", resume_type=ResumeVersion.ResumeType.TAILORED, status=ResumeVersion.Status.APPROVED)

        before = self._download_event_count()
        ok = self.client.post(f"/api/v1/public/resume/{published.slug}/download-track/", {})
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(self._download_event_count(), before + 1)

        for slug in (draft.slug, tailored.slug, "does-not-exist-at-all"):
            response = self.client.post(f"/api/v1/public/resume/{slug}/download-track/", {})
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self._download_event_count(), before + 1)

    def test_legacy_route_404_does_not_distinguish_unknown_from_private(self):
        draft = self._version(slug="legacy-existence-oracle", status=ResumeVersion.Status.DRAFT)
        private_response = self.client.post(f"/api/v1/public/resume/{draft.slug}/download-track/", {})
        unknown_response = self.client.post("/api/v1/public/resume/does-not-exist-anywhere/download-track/", {})
        self.assertEqual(private_response.status_code, unknown_response.status_code)
        self.assertEqual(private_response.status_code, status.HTTP_404_NOT_FOUND)


class AnonymousAccessTests(PublicResumeDeliveryTestCase):
    def test_anonymous_client_can_download_a_valid_published_export(self):
        self._publish_master(slug="anonymous-master")
        anonymous = Client()
        response = anonymous.get(reverse("public_resume_default_download", args=("pdf",)))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
