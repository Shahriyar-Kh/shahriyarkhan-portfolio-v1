from django.contrib.admin.sites import AdminSite
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db import connection
from django.db.models import ProtectedError
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import PublishableModel
from apps.resume_builder.admin import ResumeExportAdmin
from apps.resume_builder.api.serializers import AdminResumeVersionSerializer, PublicResumeVersionSerializer
from apps.accounts.models import UserProfile
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion


class PublicDefaultResumeTests(APITestCase):
    """P01A: /api/v1/public/resume/default/ previously crashed with a
    generic HTTP 500 when no ResumeVersion had is_default=True - a
    ModelSerializer was being asked to serialize a None instance. It must
    now return a clean 404 (a valid empty-business-state response), and
    a real 200 once a default resume exists."""

    def test_returns_404_not_500_when_no_default_resume_exists(self):
        self.assertEqual(ResumeVersion.objects.count(), 0)
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_404_when_a_resume_exists_but_none_is_marked_default(self):
        ResumeVersion.objects.create(
            title="Shahriyar Khan",
            slug="shahriyar-khan-software-engineer",
            is_default=False,
            status=PublishableModel.Status.DRAFT,
        )
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_200_when_a_published_default_resume_exists(self):
        ResumeVersion.objects.create(
            title="Shahriyar Khan",
            slug="shahriyar-khan-software-engineer",
            is_default=True,
            status=PublishableModel.Status.PUBLISHED,
        )
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["slug"], "shahriyar-khan-software-engineer")

    def test_no_published_default_resume_is_not_returned(self):
        ResumeVersion.objects.create(
            title="Draft Resume",
            slug="draft-resume",
            is_default=False,
            status=PublishableModel.Status.DRAFT,
        )
        response = self.client.get("/api/v1/public/resume/default/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ResumeDownloadTrackTests(APITestCase):
    """P01A: POSTing a download-track event for an unknown slug previously
    crashed with a generic HTTP 500 (an uncaught ResumeVersion.DoesNotExist).
    It must now return 404."""

    def test_unknown_slug_returns_404_not_500(self):
        response = self.client.post("/api/v1/public/resume/does-not-exist/download-track/", {})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_known_slug_returns_200_and_tracks_event(self):
        ResumeVersion.objects.create(
            title="Shahriyar Khan",
            slug="shahriyar-khan-software-engineer",
            is_default=True,
            status=PublishableModel.Status.PUBLISHED,
        )
        response = self.client.post(
            "/api/v1/public/resume/shahriyar-khan-software-engineer/download-track/", {}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["resume"], "shahriyar-khan-software-engineer")


    class ResumeSchemaFoundationTests(TransactionTestCase):
        def make_resume(self, **overrides):
            values = {"title": "Resume", "slug": "resume", "status": ResumeVersion.Status.DRAFT}
            values.update(overrides)
            return ResumeVersion.objects.create(**values)

        def test_lifecycle_and_resume_type_choices(self):
            self.assertEqual(
                {value for value, _label in ResumeVersion.Status.choices},
                {"draft", "approved", "published", "archived"},
            )
            self.assertEqual({value for value, _label in ResumeVersion.ResumeType.choices}, {"master", "tailored"})

        def test_only_one_published_master_and_published_default_equivalence(self):
            self.make_resume(slug="published", status=ResumeVersion.Status.PUBLISHED, is_default=True)
            with self.assertRaises(IntegrityError):
                self.make_resume(slug="second", status=ResumeVersion.Status.PUBLISHED, is_default=True)
            with self.assertRaises(IntegrityError):
                self.make_resume(slug="not-default", status=ResumeVersion.Status.PUBLISHED, is_default=False)

        def test_tailored_versions_cannot_publish_or_be_default(self):
            with self.assertRaises(IntegrityError):
                self.make_resume(slug="tailored-published", resume_type=ResumeVersion.ResumeType.TAILORED, status="published")
            with self.assertRaises(IntegrityError):
                self.make_resume(slug="tailored-default", resume_type=ResumeVersion.ResumeType.TAILORED, is_default=True)

        def test_version_uuid_is_unique_and_docx_is_supported(self):
            first = self.make_resume(slug="first")
            second = self.make_resume(slug="second")
            self.assertNotEqual(first.version_uuid, second.version_uuid)
            self.assertIn("docx", dict(ResumeExport.Format.choices))

        def test_resume_export_version_and_format_are_unique(self):
            resume = self.make_resume()
            ResumeExport.objects.create(resume_version=resume, format=ResumeExport.Format.PDF)
            with self.assertRaises(IntegrityError):
                ResumeExport.objects.create(resume_version=resume, format=ResumeExport.Format.PDF)

        def test_resume_export_admin_defers_binary_content(self):
            resume = self.make_resume()
            export = ResumeExport.objects.create(
                resume_version=resume,
                format=ResumeExport.Format.PDF,
                binary_content=b"pdf",
            )
            queryset = ResumeExportAdmin(ResumeExport, AdminSite()).get_queryset(None)
            self.assertIn("binary_content", queryset.get(pk=export.pk).get_deferred_fields())

        def test_application_accepts_master_and_tailored_versions(self):
            master = self.make_resume(slug="master")
            tailored = self.make_resume(slug="tailored", resume_type=ResumeVersion.ResumeType.TAILORED)
            JobApplicationRecord(organization="Org", job_title="Role", resume_version=master).full_clean()
            JobApplicationRecord(organization="Org", job_title="Role", resume_version=tailored).full_clean()

        def test_application_validates_export_relationship_format_and_hash(self):
            first = self.make_resume(slug="first")
            second = self.make_resume(slug="second")
            export = ResumeExport.objects.create(
                resume_version=first,
                format=ResumeExport.Format.PDF,
                sha256="a" * 64,
            )
            with self.assertRaises(ValidationError):
                JobApplicationRecord(
                    organization="Org", job_title="Role", resume_version=second, resume_export=export
                ).full_clean()
            with self.assertRaises(ValidationError):
                JobApplicationRecord(
                    organization="Org", job_title="Role", resume_version=first, resume_export=export,
                    submitted_format="docx",
                ).full_clean()
            with self.assertRaises(ValidationError):
                JobApplicationRecord(
                    organization="Org", job_title="Role", resume_version=first, resume_export=export,
                    submitted_artifact_sha256="b" * 64,
                ).full_clean()

        def test_application_protects_resume_and_export(self):
            resume = self.make_resume()
            export = ResumeExport.objects.create(resume_version=resume, format=ResumeExport.Format.PDF)
            JobApplicationRecord.objects.create(
                organization="Org", job_title="Role", resume_version=resume, resume_export=export
            )
            with self.assertRaises(ProtectedError):
                resume.delete()
            with self.assertRaises(ProtectedError):
                export.delete()

        def test_public_resume_contract_excludes_governance_and_private_fields(self):
            fields = set(PublicResumeVersionSerializer().fields)
            self.assertEqual(
                fields,
                {
                    "id", "title", "slug", "target_role", "custom_summary", "is_default",
                    "projects", "experiences", "skills", "education", "certifications", "downloads", "document",
                },
            )
            self.assertNotIn("source_facts", fields)
            self.assertNotIn("resume_content", fields)
            self.assertNotIn("version_uuid", fields)
            self.assertNotIn("source_hash", fields)
            self.assertNotIn("resume_content_hash", fields)
            self.assertNotIn("approved_by", fields)
            self.assertNotIn("published_by", fields)
            self.assertNotIn("resume_type", fields)
            self.assertNotIn("ats_tags", fields)


    class ResumeMigrationRoundTripTests(TransactionTestCase):
        @classmethod
        def setUpClass(cls):
            super().setUpClass()
            cls.executor = MigrationExecutor(connection)
            cls.latest = cls.executor.loader.graph.leaf_nodes()
            cls.executor.migrate([("resume_builder", "0001_initial")])
            cls.executor = MigrationExecutor(connection)

        @classmethod
        def tearDownClass(cls):
            cls.executor.migrate(cls.latest)
            super().tearDownClass()

        def test_forward_populates_legacy_uuid_and_reverse_maps_lifecycle(self):
            old_apps = self.executor.loader.project_state([("resume_builder", "0001_initial")]).apps
            old_resume = old_apps.get_model("resume_builder", "ResumeVersion")
            old_resume.objects.create(title="Legacy", slug="legacy", status="published", is_default=True)

            target = "0002_jobapplicationrecord_resumeexport_binary_content_and_more"
            self.executor.migrate([("resume_builder", target)])
            self.executor = MigrationExecutor(connection)
            current_apps = self.executor.loader.project_state([("resume_builder", target)]).apps
            current_resume = current_apps.get_model("resume_builder", "ResumeVersion")
            self.assertIsNotNone(current_resume.objects.get(slug="legacy").version_uuid)
            current_resume.objects.create(title="Approved", slug="approved", status="approved", resume_type="master")
            current_resume.objects.create(
                title="Archived published",
                slug="archived-published",
                status="archived",
                resume_type="master",
                published_at="2026-01-01T00:00:00Z",
            )
            current_resume.objects.create(title="Archived draft", slug="archived-draft", status="archived", resume_type="master")

            self.executor.migrate([("resume_builder", "0001_initial")])
            self.executor = MigrationExecutor(connection)
            rolled_back_apps = self.executor.loader.project_state([("resume_builder", "0001_initial")]).apps
            rolled_back_resume = rolled_back_apps.get_model("resume_builder", "ResumeVersion")
            statuses = dict(rolled_back_resume.objects.values_list("slug", "status"))
            self.assertEqual(statuses["approved"], "draft")
            self.assertEqual(statuses["archived-published"], "published")
            self.assertEqual(statuses["archived-draft"], "draft")


ResumeSchemaFoundationTests = ResumeDownloadTrackTests.ResumeSchemaFoundationTests
ResumeMigrationRoundTripTests = ResumeDownloadTrackTests.ResumeMigrationRoundTripTests


class ResumeApiSecurityTests(APITestCase):
    def test_anonymous_admin_access_is_denied(self):
        response = self.client.get("/api/v1/admin/resume/versions/")
        self.assertIn(response.status_code, (401, 403))

    def test_authenticated_non_owner_is_denied_and_owner_is_allowed(self):
        user_model = get_user_model()
        staff = user_model.objects.create_user(username="staff", password="password", is_staff=True)
        self.client.force_authenticate(user=staff)
        self.assertEqual(self.client.get("/api/v1/admin/resume/versions/").status_code, 403)
        owner = user_model.objects.create_user(username="owner", password="password", is_staff=True)
        owner.profile.is_owner = True
        owner.profile.save(update_fields=("is_owner",))
        self.client.force_authenticate(user=owner)
        self.assertEqual(self.client.get("/api/v1/admin/resume/versions/").status_code, 200)

    def test_admin_serializer_governance_and_snapshot_fields_are_read_only(self):
        read_only = set(AdminResumeVersionSerializer().Meta.read_only_fields)
        self.assertTrue({"status", "is_default", "source_facts", "source_hash", "resume_content_hash"}.issubset(read_only))

    def test_private_applications_are_not_publicly_routable(self):
        self.assertEqual(self.client.get("/api/v1/public/resume/applications/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/public/resume/assessments/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/public/resume/ats/").status_code, 404)
