from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import PublishableModel
from apps.resume_builder.models import ResumeVersion


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
            status=PublishableModel.Status.PUBLISHED,
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

    def test_unpublished_default_resume_is_not_returned(self):
        ResumeVersion.objects.create(
            title="Draft Resume",
            slug="draft-resume",
            is_default=True,
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
