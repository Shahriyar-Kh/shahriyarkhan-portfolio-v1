import hashlib
import json

from django.db.models import Count
from django.http import Http404, HttpResponse, HttpResponseNotModified
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPortfolioAdmin
from apps.analytics_app.models import AnalyticsEvent
from apps.resume_builder.api.serializers import AdminJobApplicationSerializer, AdminResumeVersionSerializer, PublicResumeVersionSerializer
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion
from apps.resume_builder.services import advance_application_status, approve_version, archive_version, mark_application_applied, publish_version, update_resume_content
from apps.resume_builder.services.exceptions import SnapshotError
from apps.resume_builder.services.exports import artifact_filename, artifact_mime_type, resolve_downloadable_export

_PUBLISHED_DEFAULT_MASTER = {
    "resume_type": ResumeVersion.ResumeType.MASTER,
    "status": ResumeVersion.Status.PUBLISHED,
    "is_default": True,
}
_PUBLISHED_MASTER = {
    "resume_type": ResumeVersion.ResumeType.MASTER,
    "status": ResumeVersion.Status.PUBLISHED,
}


def _public_resume_etag(document):
    """A weak-in-spirit but strong-syntax ETag computed only from the
    safe public `document` DTO (never from an internal hash field, and
    never exposed inside the JSON body itself) - changes exactly when
    the current master's presentation content changes, so a cache can
    revalidate correctly across a republish."""
    if document is None:
        return None
    digest = hashlib.sha256(json.dumps(document, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    return f'"{digest}"'


class _NoStoreCurrentMasterCacheMixin:
    """B7-RC correction 2: the résumé representation must always reflect
    whichever master is currently published, so responses are never
    cached as reusable-without-revalidation - a proxy/CDN must always
    check back with the origin. Pairs with the frontend's `cache:
    "no-store"` fetch and `export const dynamic = "force-dynamic"` on
    /resume, which together stop the previous one-hour ISR window from
    ever serving a stale master."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "public, no-cache, must-revalidate"
        if response.status_code == 200 and isinstance(getattr(response, "data", None), dict):
            etag = _public_resume_etag(response.data.get("document"))
            if etag:
                response["ETag"] = etag
        return response


class PublicDefaultResumeView(_NoStoreCurrentMasterCacheMixin, generics.RetrieveAPIView):
    serializer_class = PublicResumeVersionSerializer
    permission_classes = (AllowAny,)

    def get_object(self):
        instance = ResumeVersion.objects.filter(**_PUBLISHED_DEFAULT_MASTER).first()
        if instance is None:
            # No default resume configured yet is a valid (empty) business
            # state, not a server error - return 404, not a 500 from
            # serializing a None instance.
            raise Http404("No published default resume is configured.")
        return instance


class PublicResumeBySlugView(_NoStoreCurrentMasterCacheMixin, generics.RetrieveAPIView):
    serializer_class = PublicResumeVersionSerializer
    permission_classes = (AllowAny,)
    # Only a published master can ever satisfy this filter - a draft,
    # approved, archived, or tailored version (even if somehow published)
    # must never be resolvable by slug. The DB's own constraints already
    # forbid a published tailored row; this filter is defense in depth
    # that doesn't rely on that alone.
    queryset = ResumeVersion.objects.filter(**_PUBLISHED_MASTER)
    lookup_field = "slug"


class PublicResumeDownloadTrackView(APIView):
    """Legacy client-reported tracking endpoint, preserved for backward
    compatibility. Hardened to only acknowledge/track a slug that
    resolves to a currently published master - a draft, approved,
    archived, or tailored slug returns the same generic 404 as an
    unknown slug, so this endpoint cannot be used to probe for the
    existence of private résumé records. Not called by the current
    /resume page (see PublicResumeDefaultDownloadView, which tracks a
    real successful download server-side and cannot double-count)."""

    permission_classes = (AllowAny,)

    def post(self, request, slug):
        try:
            resume = ResumeVersion.objects.get(slug=slug, **_PUBLISHED_MASTER)
        except ResumeVersion.DoesNotExist:
            raise Http404("No resume version matches this slug.")
        AnalyticsEvent.objects.create(
            event_type=AnalyticsEvent.EventType.RESUME_DOWNLOAD,
            page_path=f"/resume/{slug}",
            metadata={"source": request.data.get("source", "public")},
        )
        return Response({"message": "Resume download tracked", "resume": resume.slug})


def _if_none_match_hit(request, etag):
    header = request.headers.get("If-None-Match", "")
    if not header:
        return False
    candidates = {value.strip() for value in header.split(",")}
    return etag in candidates or "*" in candidates


class PublicResumeDefaultDownloadView(APIView):
    """Serves the exact, already-generated PDF/DOCX bytes for the single
    current published default master résumé. Never generates a document -
    generation only ever happens through the private Admin workflow (see
    apps.resume_builder.services.exports.generate_resume_export). GET and
    HEAD are both supported; a matching If-None-Match short-circuits to a
    bodyless 304. A successful GET (not HEAD, not 304, not an error) is
    the only case tracked through the existing analytics mechanism, so a
    HEAD probe, a conditional revalidation, or a rejected/missing export
    can never inflate the download count."""

    permission_classes = (AllowAny,)

    def _resolve(self, format_name):
        if format_name not in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
            raise Http404("Unsupported résumé format.")
        version = ResumeVersion.objects.filter(**_PUBLISHED_DEFAULT_MASTER).first()
        if version is None:
            raise Http404("No published résumé is available.")
        # Same resolve_downloadable_export() policy the public JSON
        # `downloads` flag uses (full artifact-level revalidation:
        # checksum, byte size, content-hash binding, structural re-parse)
        # before ANY response - including HEAD and a 304 - so a
        # corrupt/stale/pending/failed export can never be confirmed as
        # "unchanged", described by headers, or reported available.
        export = resolve_downloadable_export(version, format_name)
        if export is None:
            raise Http404("Requested résumé format is not available.")
        return version, export

    def _not_modified(self, etag):
        response = HttpResponseNotModified()
        response["ETag"] = etag
        response["Cache-Control"] = "public, no-cache, must-revalidate"
        return response

    def _common_headers(self, response, version, export, format_name):
        response["Content-Type"] = artifact_mime_type(format_name)
        response["Content-Disposition"] = f'attachment; filename="{artifact_filename(version, format_name)}"'
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "public, no-cache, must-revalidate"
        response["ETag"] = f'"{export.sha256}"'
        return response

    def get(self, request, format_name):
        version, export = self._resolve(format_name)
        etag = f'"{export.sha256}"'
        if _if_none_match_hit(request, etag):
            return self._not_modified(etag)

        artifact = bytes(export.binary_content)
        response = HttpResponse(artifact, content_type=artifact_mime_type(format_name))
        self._common_headers(response, version, export, format_name)
        response["Content-Length"] = str(len(artifact))
        # Tracked here, exactly once, only for a real body-bearing GET -
        # never for HEAD, a 304, or any rejected/missing export above.
        AnalyticsEvent.objects.create(
            event_type=AnalyticsEvent.EventType.RESUME_DOWNLOAD,
            page_path="/resume",
            metadata={"format": format_name, "resume_slug": version.slug, "channel": "stable_download"},
        )
        return response

    def head(self, request, format_name):
        version, export = self._resolve(format_name)
        etag = f'"{export.sha256}"'
        if _if_none_match_hit(request, etag):
            return self._not_modified(etag)

        response = HttpResponse(b"", content_type=artifact_mime_type(format_name))
        self._common_headers(response, version, export, format_name)
        response["Content-Length"] = str(export.byte_size)
        return response


class AdminResumeVersionViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = AdminResumeVersionSerializer
    queryset = ResumeVersion.objects.all()

    def _service_error(self, exc):
        return Response({"code": getattr(exc, "code", "invalid_snapshot"), "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="update-content")
    def update_content(self, request, pk=None):
        try:
            version = update_resume_content(version=self.get_object(), content=request.data.get("resume_content"))
            return Response(AdminResumeVersionSerializer(version).data)
        except SnapshotError as exc:
            return self._service_error(exc)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        try:
            return Response(AdminResumeVersionSerializer(approve_version(version=self.get_object(), actor=request.user)).data)
        except SnapshotError as exc:
            return self._service_error(exc)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        try:
            return Response(AdminResumeVersionSerializer(publish_version(version=self.get_object(), actor=request.user)).data)
        except SnapshotError as exc:
            return self._service_error(exc)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        try:
            return Response(AdminResumeVersionSerializer(archive_version(version=self.get_object(), actor=request.user)).data)
        except SnapshotError as exc:
            return self._service_error(exc)


class AdminJobApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = AdminJobApplicationSerializer
    queryset = JobApplicationRecord.objects.select_related("resume_version", "resume_export")

    @action(detail=True, methods=["post"], url_path="mark-application-applied")
    def mark_applied(self, request, pk=None):
        try:
            export = ResumeExport.objects.get(pk=request.data.get("resume_export"))
            application = mark_application_applied(application=self.get_object(), export=export, actor=request.user)
            return Response(AdminJobApplicationSerializer(application).data)
        except (SnapshotError, ResumeExport.DoesNotExist):
            return Response({"code": "invalid_application", "message": "Application could not be marked applied."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="advance-application-status")
    def advance_status(self, request, pk=None):
        try:
            application = advance_application_status(application=self.get_object(), status=request.data.get("status"))
            return Response(AdminJobApplicationSerializer(application).data)
        except SnapshotError as exc:
            return Response({"code": getattr(exc, "code", "invalid_transition"), "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
