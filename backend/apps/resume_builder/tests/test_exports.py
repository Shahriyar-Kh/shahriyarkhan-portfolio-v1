import hashlib
from io import BytesIO
from unittest.mock import patch
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from docx import Document
from pypdf import PdfReader

from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import (
    approve_version,
    artifact_filename,
    artifact_mime_type,
    create_master_draft,
    generate_resume_export,
    resume_content_hash,
    source_hash,
)
from apps.site_config.models import SiteSetting
from apps.resume_builder.services.exceptions import (
    ExportGenerationError,
    ExportIntegrityError,
    SnapshotValidationError,
    StaleSnapshotError,
)
from apps.resume_builder.services.exports.docx import render_docx
from apps.resume_builder.services.exports.normalized import normalize_resume
from apps.resume_builder.services.exports.pdf import render_pdf
from apps.resume_builder.services.exports.validation import extract_artifact_text, validate_artifact


@override_settings(ADMIN_URL_PATH="admin")
class ResumeExportServiceTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="export-owner", password="password", is_staff=True)
        self.owner.profile.is_owner = True
        self.owner.profile.save(update_fields=("is_owner",))
        self.staff = user_model.objects.create_user(username="export-staff", password="password", is_staff=True)

    def _claim(self, section, number, field, value):
        return {
            "claim_id": f"fixture.{section}:{number}:{field}",
            "value": value,
            "source": {"model": f"fixture.{section}", "record_id": number, "field": field},
        }

    def _approved_version(self, *, resume_type="master", content_transform=None):
        section_values = {
            "profile": (
                ("owner_name", "Morgan Reed"),
                ("professional_title", "Python & Django Software Engineer"),
                ("public_email", "morgan@example.invalid"),
                ("public_location", "Sample City"),
                ("website", "https://example.invalid/morgan"),
                ("portfolio", "http://example.invalid/portfolio"),
            ),
            "custom_summary": (("custom_summary", "Evidence-led engineer building reliable systems."),),
            "skills": (("name", "Python, Django, PostgreSQL, testing"),),
            "experience": (
                ("achievement", "Reduced verified processing time by 35% with measured automation."),
                ("achievement", "Built a café-safe Unicode workflow — with complete tests."),
            ),
            "projects": (("description", "Delivered a deterministic API service with 99.9% measured availability."),),
            "education": (("degree", "BSc Computer Science — Example University"),),
            "certifications": (("name", "Verified Secure Software Practitioner — Example Institute"),),
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
        facts = {
            "schema_version": 1,
            "sections": sections,
            "provenance": {"claim_count": len(content_items), "source": "synthetic_test_fixture", "selected_records": []},
        }
        content = {"positioning": "Python & Django Software Engineer", "items": content_items}
        if content_transform:
            content_transform(content, facts)
        version = ResumeVersion.objects.create(
            title="Synthetic ATS Resume",
            slug=f"synthetic-ats-resume-{ResumeVersion.objects.count()}",
            resume_type=resume_type,
            status=ResumeVersion.Status.APPROVED,
            source_facts=facts,
            resume_content=content,
            source_hash=source_hash(facts),
            resume_content_hash=resume_content_hash(content),
            approved_at=timezone.now(),
            approved_by=self.owner,
        )
        return version

    def _generate(self, version, format_name):
        return generate_resume_export(resume_version=version, format_name=format_name, actor=self.owner)

    def test_pdf_is_real_searchable_bounded_bound_to_snapshot_and_idempotent(self):
        version = self._approved_version()
        export = self._generate(version, "pdf")
        artifact = bytes(export.binary_content)
        reader = PdfReader(BytesIO(artifact), strict=True)
        self.assertTrue(artifact.startswith(b"%PDF-"))
        self.assertLessEqual(len(reader.pages), 2)
        self.assertEqual(reader.metadata.subject, f"resume-content-sha256:{version.resume_content_hash}")
        self.assertIn("Morgan Reed", extract_artifact_text(format_name="pdf", artifact=artifact))
        self.assertEqual(export.sha256, hashlib.sha256(artifact).hexdigest())
        self.assertEqual(export.byte_size, len(artifact))
        self.assertFalse(export.file)
        for page in reader.pages:
            resources = page.get("/Resources").get_object()
            xobjects = resources.get("/XObject")
            for reference in xobjects.get_object().values() if xobjects else ():
                self.assertNotEqual(reference.get_object().get("/Subtype"), "/Image")
        repeated = self._generate(version, "pdf")
        self.assertEqual(repeated.pk, export.pk)
        self.assertEqual(bytes(repeated.binary_content), artifact)
        self.assertEqual(ResumeExport.objects.count(), 1)

    def test_docx_is_real_searchable_and_contains_no_tables_images_macros_or_custom_xml(self):
        version = self._approved_version()
        export = self._generate(version, "docx")
        artifact = bytes(export.binary_content)
        parsed = Document(BytesIO(artifact))
        self.assertFalse(parsed.tables)
        self.assertFalse(parsed.inline_shapes)
        self.assertEqual(parsed.core_properties.subject, f"resume-content-sha256:{version.resume_content_hash}")
        self.assertIn("Morgan Reed", extract_artifact_text(format_name="docx", artifact=artifact))
        with ZipFile(BytesIO(artifact)) as archive:
            names = "\n".join(archive.namelist()).lower()
        for forbidden in ("word/media/", "vbaproject", "customxml/", "thumbnail", "word/embeddings/"):
            self.assertNotIn(forbidden, names)
        self.assertEqual(export.sha256, hashlib.sha256(artifact).hexdigest())
        self.assertEqual(export.byte_size, len(artifact))

    def test_pdf_and_docx_have_semantic_parity_and_canonical_order(self):
        version = self._approved_version()
        document_model = normalize_resume(version)
        outputs = {
            format_name: extract_artifact_text(format_name=format_name, artifact=bytes(self._generate(version, format_name).binary_content))
            for format_name in ("pdf", "docx")
        }
        for text in outputs.values():
            cursor = 0
            for marker in document_model.semantic_lines:
                position = " ".join(text.split()).find(" ".join(marker.split()), cursor)
                self.assertGreaterEqual(position, 0, marker)
                cursor = position + len(" ".join(marker.split()))
        self.assertEqual(set(outputs), {"pdf", "docx"})

    def test_rendering_is_byte_deterministic_for_the_same_snapshot(self):
        version = self._approved_version()
        for format_name in ("pdf", "docx"):
            first = self._generate(version, format_name)
            first_bytes = bytes(first.binary_content)
            first.delete()
            second = self._generate(version, format_name)
            self.assertEqual(bytes(second.binary_content), first_bytes)

    def test_renderers_are_directly_byte_deterministic_for_identical_input(self):
        version = self._approved_version()
        document_model = normalize_resume(version)
        self.assertEqual(render_pdf(document_model), render_pdf(document_model))
        self.assertEqual(render_docx(document_model), render_docx(document_model))

    def test_different_resume_content_produces_different_artifact_hashes(self):
        first = self._approved_version()

        def reworded(content, facts):
            summary = next(item for item in content["items"] if item["section"] == "summary")
            summary["text"] = "A distinctly different summary for the second snapshot."
            facts["sections"]["custom_summary"][0]["value"] = summary["text"]

        second = self._approved_version(content_transform=reworded)
        for format_name in ("pdf", "docx"):
            first_export = self._generate(first, format_name)
            second_export = self._generate(second, format_name)
            self.assertNotEqual(first_export.sha256, second_export.sha256)
            self.assertNotEqual(bytes(first_export.binary_content), bytes(second_export.binary_content))

    def test_safe_derived_filenames_and_mime_types(self):
        version = self._approved_version()
        self.assertEqual(artifact_filename(version, "pdf"), f"resume-{version.version_uuid.hex}.pdf")
        self.assertEqual(artifact_filename(version, "docx"), f"resume-{version.version_uuid.hex}.docx")
        self.assertEqual(artifact_mime_type("pdf"), "application/pdf")
        self.assertEqual(artifact_mime_type("docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    def test_approved_master_and_tailored_are_supported_but_other_states_are_rejected(self):
        self._generate(self._approved_version(resume_type="master"), "pdf")
        self._generate(self._approved_version(resume_type="tailored"), "docx")
        for status in (ResumeVersion.Status.DRAFT, ResumeVersion.Status.PUBLISHED, ResumeVersion.Status.ARCHIVED):
            version = self._approved_version()
            version.status = status
            version.is_default = status == ResumeVersion.Status.PUBLISHED
            version.save(update_fields=("status", "is_default"))
            with self.subTest(status=status), self.assertRaises(ExportGenerationError):
                self._generate(version, "pdf")
        self.assertEqual(ResumeExport.objects.count(), 2)

    def test_unsupported_format_and_non_owner_are_rejected_without_rows(self):
        version = self._approved_version()
        with self.assertRaises(ExportGenerationError):
            generate_resume_export(resume_version=version, format_name="html", actor=self.owner)
        with self.assertRaises(ExportGenerationError):
            generate_resume_export(resume_version=version, format_name="pdf", actor=self.staff)
        with self.assertRaises(ExportGenerationError):
            generate_resume_export(resume_version=version, format_name="pdf", actor=None)
        self.assertFalse(ResumeExport.objects.exists())

    def test_stale_hashes_and_unknown_evidence_fail_atomically(self):
        stale = self._approved_version()
        stale.resume_content_hash = "0" * 64
        stale.save(update_fields=("resume_content_hash",))
        with self.assertRaises(StaleSnapshotError):
            self._generate(stale, "pdf")

        invalid = self._approved_version()
        content = dict(invalid.resume_content)
        content["items"] = [dict(item) for item in content["items"]]
        content["items"][0]["source_claim_ids"] = ["missing:claim"]
        invalid.resume_content = content
        invalid.resume_content_hash = resume_content_hash(content)
        invalid.save(update_fields=("resume_content", "resume_content_hash"))
        with self.assertRaises(SnapshotValidationError):
            self._generate(invalid, "docx")
        self.assertFalse(ResumeExport.objects.exists())

    def test_markup_unicode_controls_and_safe_links_render_as_visible_text(self):
        # A vertical tab, not a NUL byte: PostgreSQL's jsonb/text storage
        # cannot represent a literal NUL at all (INSERT is rejected before
        # clean_text() would ever see it), so this exercises the identical
        # _is_forbidden_control() codepoint-< 32 stripping path with a
        # control character that both SQLite and PostgreSQL can store.
        def transform(content, facts):
            value = "<script>alert(1)</script> & café — safe\u000b https://example.invalid/profile"
            summary = next(item for item in content["items"] if item["section"] == "summary")
            summary["text"] = value
            facts["sections"]["custom_summary"][0]["value"] = value

        version = self._approved_version(content_transform=transform)
        for format_name in ("pdf", "docx"):
            artifact = bytes(self._generate(version, format_name).binary_content)
            text = extract_artifact_text(format_name=format_name, artifact=artifact)
            self.assertIn("<script>alert(1)</script> & café", text)
            self.assertNotIn("\u000b", text)
            self.assertIn("https://example.invalid/profile", text)

    def test_http_and_https_links_are_clickable_in_both_formats(self):
        version = self._approved_version()
        pdf = PdfReader(BytesIO(bytes(self._generate(version, "pdf").binary_content)), strict=True)
        pdf_urls = {
            str(annotation.get_object()["/A"]["/URI"])
            for page in pdf.pages
            for annotation in page.get("/Annots", [])
        }
        self.assertIn("https://example.invalid/morgan", pdf_urls)
        self.assertIn("http://example.invalid/portfolio", pdf_urls)
        docx = self._generate(version, "docx")
        with ZipFile(BytesIO(bytes(docx.binary_content))) as archive:
            relationships = archive.read("word/_rels/document.xml.rels").decode("utf-8")
        self.assertIn("https://example.invalid/morgan", relationships)
        self.assertIn("http://example.invalid/portfolio", relationships)

    def test_unsafe_links_and_input_bounds_fail_before_persistence(self):
        for scheme in ("javascript:alert(1)", "data:text/plain,bad", "file:///private.txt"):
            def unsafe(content, facts, value=scheme):
                summary = next(item for item in content["items"] if item["section"] == "summary")
                summary["text"] = value
                facts["sections"]["custom_summary"][0]["value"] = value

            with self.subTest(scheme=scheme), self.assertRaises(SnapshotValidationError):
                self._generate(self._approved_version(content_transform=unsafe), "pdf")

        def oversized(content, facts):
            value = "x" * 4_001
            summary = next(item for item in content["items"] if item["section"] == "summary")
            summary["text"] = value
            facts["sections"]["custom_summary"][0]["value"] = value

        with self.assertRaises(SnapshotValidationError):
            self._generate(self._approved_version(content_transform=oversized), "docx")
        self.assertFalse(ResumeExport.objects.exists())

    def test_renderer_failure_creates_no_partial_row_and_does_not_replace_valid_export(self):
        version = self._approved_version()

        def fail(_document):
            raise RuntimeError("sensitive renderer detail")

        with patch.dict("apps.resume_builder.services.exports.orchestration.RENDERERS", {"pdf": fail}, clear=False):
            with self.assertRaisesRegex(ExportGenerationError, "failed safely"):
                self._generate(version, "pdf")
        self.assertFalse(ResumeExport.objects.exists())

        valid = self._generate(version, "pdf")
        original = bytes(valid.binary_content)
        with patch.dict("apps.resume_builder.services.exports.orchestration.RENDERERS", {"pdf": fail}, clear=False):
            repeated = self._generate(version, "pdf")
        self.assertEqual(repeated.pk, valid.pk)
        self.assertEqual(bytes(repeated.binary_content), original)

    def test_corrupt_existing_export_fails_without_replacement(self):
        version = self._approved_version()
        export = self._generate(version, "pdf")
        corrupt = b"not-a-pdf"
        ResumeExport.objects.filter(pk=export.pk).update(
            binary_content=corrupt,
            byte_size=len(corrupt),
            sha256=hashlib.sha256(corrupt).hexdigest(),
        )
        with self.assertRaises(ExportIntegrityError):
            self._generate(version, "pdf")
        stored = ResumeExport.objects.get(pk=export.pk)
        self.assertEqual(bytes(stored.binary_content), corrupt)
        self.assertEqual(ResumeExport.objects.count(), 1)

    def test_artifact_size_cap_is_enforced_before_persistence(self):
        version = self._approved_version()
        oversized = b"x" * (5 * 1024 * 1024 + 1)
        with patch.dict("apps.resume_builder.services.exports.orchestration.RENDERERS", {"pdf": lambda _document: oversized}, clear=False):
            with self.assertRaises(ExportIntegrityError):
                self._generate(version, "pdf")
        self.assertFalse(ResumeExport.objects.exists())

    def test_admin_generation_get_does_not_mutate_post_generates_and_csrf_is_required(self):
        version = self._approved_version()
        self.client.force_login(self.owner)
        url = reverse("admin:resume_builder_generate_export", args=(version.pk, "pdf"))
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(ResumeExport.objects.exists())
        response = self.client.post(url)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ResumeExport.objects.filter(resume_version=version, format="pdf").exists())
        version.refresh_from_db()
        self.assertEqual(version.status, ResumeVersion.Status.APPROVED)

        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.owner)
        docx_url = reverse("admin:resume_builder_generate_export", args=(version.pk, "docx"))
        self.assertEqual(csrf_client.post(docx_url).status_code, 403)
        self.assertFalse(ResumeExport.objects.filter(resume_version=version, format="docx").exists())
        superuser = get_user_model().objects.create_superuser(
            username="export-superuser",
            password="password",
            email="superuser@example.invalid",
        )
        self.client.force_login(superuser)
        self.assertEqual(self.client.post(docx_url).status_code, 302)
        self.assertTrue(ResumeExport.objects.filter(resume_version=version, format="docx").exists())

    def test_admin_download_is_owner_only_and_sets_strict_headers(self):
        version = self._approved_version()
        export = self._generate(version, "docx")
        url = reverse("admin:resume_builder_download_export", args=(version.pk, "docx"))

        anonymous = self.client.get(url)
        self.assertEqual(anonymous.status_code, 302)
        self.client.force_login(self.staff)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_login(self.owner)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, bytes(export.binary_content))
        self.assertEqual(response["Content-Type"], artifact_mime_type("docx"))
        self.assertEqual(response["Content-Disposition"], f'attachment; filename="{artifact_filename(version, "docx")}"')
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertIn("private", response["Cache-Control"])
        self.assertIn("no-store", response["Cache-Control"])
        superuser = get_user_model().objects.create_superuser(
            username="download-superuser",
            password="password",
            email="download-superuser@example.invalid",
        )
        self.client.force_login(superuser)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_admin_download_rejects_corruption_and_no_public_export_route_exists(self):
        version = self._approved_version()
        export = self._generate(version, "pdf")
        ResumeExport.objects.filter(pk=export.pk).update(binary_content=b"bad", byte_size=3, sha256=hashlib.sha256(b"bad").hexdigest())
        self.client.force_login(self.owner)
        url = reverse("admin:resume_builder_download_export", args=(version.pk, "pdf"))
        self.assertEqual(self.client.get(url).status_code, 404)
        for path in (
            "/api/v1/public/resume/exports/",
            "/api/v1/public/resume/assessments/",
            f"/api/v1/public/resume/{version.slug}/pdf/",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)

    def test_generated_artifacts_pass_explicit_deep_validation(self):
        version = self._approved_version()
        document_model = normalize_resume(version)
        for format_name in ("pdf", "docx"):
            export = self._generate(version, format_name)
            extracted = validate_artifact(
                format_name=format_name,
                artifact=bytes(export.binary_content),
                expected_content_hash=version.resume_content_hash,
                document_model=document_model,
            )
            self.assertIn("Morgan Reed", extracted)

    def test_generation_uses_frozen_identity_and_contact_not_changed_live_rows(self):
        site = SiteSetting.objects.create(
            owner_name="Synthetic Frozen Owner",
            public_email="frozen@example.invalid",
            public_location="Frozen Sample City",
        )
        version = create_master_draft(actor=self.owner)
        version = approve_version(version=version, actor=self.owner)
        site.owner_name = "Changed Live Owner"
        site.public_email = "changed@example.invalid"
        site.save(update_fields=("owner_name", "public_email"))
        artifact = bytes(self._generate(version, "pdf").binary_content)
        text = extract_artifact_text(format_name="pdf", artifact=artifact)
        self.assertIn("Synthetic Frozen Owner", text)
        self.assertIn("frozen@example.invalid", text)
        self.assertNotIn("Changed Live Owner", text)
        self.assertNotIn("changed@example.invalid", text)
