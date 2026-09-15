from django.contrib import admin, messages
from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import PermissionDenied
from django.db import IntegrityError, transaction
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse

from apps.accounts.permissions import is_portfolio_admin_user
from apps.resume_builder.admin_forms import JobApplicationAdminForm, ResumeContentForm, ResumeDraftForm
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion
from apps.resume_builder.services import (
    SnapshotError,
    archive_version,
    approve_version,
    clone_version_to_draft,
    compare_freshness,
    create_master_draft,
    create_tailored_draft,
    artifact_filename,
    artifact_mime_type,
    generate_resume_export,
    mark_application_applied,
    publish_version,
    regenerate_from_current_portfolio,
    update_resume_content,
    validate_generated_export,
)
from apps.resume_builder.services.ats import ATSAssessmentError, DISCLAIMER, run_job_match_assessment, run_readiness_assessment
from apps.resume_builder.services.exceptions import ExportIntegrityError


def _admin_only(view):
    return staff_member_required(view, login_url="/admin/login/")


def _version(request, object_id):
    if not is_portfolio_admin_user(request.user, require_owner_role=True):
        raise PermissionDenied
    return get_object_or_404(ResumeVersion, pk=object_id)


class OwnerAdminMixin:
    def _owner_allowed(self, request):
        return is_portfolio_admin_user(request.user, require_owner_role=True)

    def has_module_permission(self, request):
        return self._owner_allowed(request)

    def has_view_permission(self, request, obj=None):
        return self._owner_allowed(request)

    def has_add_permission(self, request):
        return self._owner_allowed(request)

    def has_change_permission(self, request, obj=None):
        return self._owner_allowed(request)

    def has_delete_permission(self, request, obj=None):
        return self._owner_allowed(request)


def _safe_error(request, error):
    messages.error(request, str(error))


def create_draft_view(request):
    if not is_portfolio_admin_user(request.user, require_owner_role=True):
        raise PermissionDenied
    if request.method == "POST":
        form = ResumeDraftForm(request.POST)
        if form.is_valid():
            selections = {
                "include_experiences": form.cleaned_data["experiences"],
                "include_education": form.cleaned_data["education"],
                "include_skills": form.cleaned_data["skills"],
                "include_projects": form.cleaned_data["projects"],
                "include_certifications": form.cleaned_data["certifications"],
            }
            try:
                if form.cleaned_data["resume_type"] == ResumeVersion.ResumeType.MASTER:
                    version = create_master_draft(actor=request.user, custom_summary=form.cleaned_data["custom_summary"], selections=selections)
                else:
                    version = create_tailored_draft(actor=request.user, title=form.cleaned_data["title"], target_role=form.cleaned_data["target_role"], target_organization=form.cleaned_data["target_organization"], custom_summary=form.cleaned_data["custom_summary"], selections=selections)
                messages.success(request, "Résumé draft created.")
                return redirect("admin:resume_builder_resumeversion_change", version.pk)
            except SnapshotError as error:
                _safe_error(request, error)
    else:
        form = ResumeDraftForm()
    return render(request, "admin/resume_builder/draft_form.html", {"form": form, "title": "Create Résumé Draft"})


def version_preview_view(request, object_id):
    version = _version(request, object_id)
    freshness = compare_freshness(version)
    readiness = {}
    for export in version.exports.all():
        try:
            validate_generated_export(export)
            readiness[export.format] = "valid"
        except ExportIntegrityError:
            readiness[export.format] = "missing or invalid"
    return render(request, "admin/resume_builder/preview.html", {"version": version, "freshness": freshness, "readiness": readiness, "ats_disclaimer": DISCLAIMER})


def content_edit_view(request, object_id):
    version = _version(request, object_id)
    if version.status != ResumeVersion.Status.DRAFT:
        raise PermissionDenied
    if request.method == "POST":
        form = ResumeContentForm(request.POST, content=version.resume_content)
        if form.is_valid():
            try:
                update_resume_content(version=version, content=form.build_content())
                messages.success(request, "Résumé wording updated.")
                return redirect("admin:resume_builder_admin_preview", version.pk)
            except SnapshotError as error:
                _safe_error(request, error)
    else:
        form = ResumeContentForm(content=version.resume_content)
    return render(request, "admin/resume_builder/content_form.html", {"form": form, "version": version, "title": "Edit Résumé Content"})


def action_view(request, object_id, action):
    if request.method != "POST":
        return render(request, "admin/resume_builder/confirm.html", {"version": _version(request, object_id), "action": action})
    version = _version(request, object_id)
    try:
        if action == "clone":
            result = clone_version_to_draft(source=version, actor=request.user)
        elif action == "regenerate":
            result = regenerate_from_current_portfolio(source=version, actor=request.user)
        elif action == "approve":
            result = approve_version(version=version, actor=request.user)
        elif action == "publish":
            result = publish_version(version=version, actor=request.user)
        elif action == "archive":
            result = archive_version(version=version, actor=request.user)
        else:
            raise Http404
        messages.success(request, f"Résumé {action} completed.")
        return redirect("admin:resume_builder_resumeversion_change", result.pk)
    except SnapshotError as error:
        _safe_error(request, error)
        return redirect("admin:resume_builder_resumeversion_change", version.pk)


def freshness_view(request, object_id):
    version = _version(request, object_id)
    result = compare_freshness(version)
    messages.info(request, f"Snapshot freshness: {result['status']}.")
    return redirect("admin:resume_builder_resumeversion_change", version.pk)


def generate_export_view(request, object_id, format_name):
    version = _version(request, object_id)
    if format_name not in {ResumeExport.Format.PDF, ResumeExport.Format.DOCX}:
        raise Http404
    if request.method != "POST":
        return render(
            request,
            "admin/resume_builder/confirm.html",
            {"version": version, "action": f"generate {format_name.upper()} export"},
        )
    try:
        generate_resume_export(
            resume_version=version,
            format_name=format_name,
            actor=request.user,
        )
        messages.success(request, f"{format_name.upper()} export is ready.")
    except SnapshotError as error:
        _safe_error(request, error)
    return redirect("admin:resume_builder_resumeversion_change", version.pk)


def download_export_view(request, object_id, format_name):
    version = _version(request, object_id)
    if request.method != "GET" or format_name not in {ResumeExport.Format.PDF, ResumeExport.Format.DOCX}:
        raise Http404
    export = get_object_or_404(
        ResumeExport.objects.select_related("resume_version"),
        resume_version=version,
        format=format_name,
    )
    try:
        validate_generated_export(export, inspect_artifact=True)
    except ExportIntegrityError as error:
        raise Http404("Export is unavailable.") from error
    response = HttpResponse(bytes(export.binary_content), content_type=artifact_mime_type(format_name))
    response["Content-Disposition"] = f'attachment; filename="{artifact_filename(version, format_name)}"'
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "private, no-store"
    return response


def readiness_assessment_view(request, object_id):
    version = _version(request, object_id)
    if request.method != "POST":
        return render(request, "admin/resume_builder/confirm.html", {"version": version, "action": "run ATS readiness"})
    try:
        run_readiness_assessment(version=version, actor=request.user)
        messages.success(request, "ATS readiness assessment created.")
    except ATSAssessmentError as error:
        _safe_error(request, error)
    return redirect("admin:resume_builder_resumeversion_change", version.pk)


def job_match_assessment_view(request, object_id):
    if request.method != "POST" or not is_portfolio_admin_user(request.user, require_owner_role=True):
        if request.method != "POST":
            return render(request, "admin/resume_builder/confirm.html", {"version": _version(request, object_id), "action": "run ATS job match"})
        raise PermissionDenied
    application = get_object_or_404(JobApplicationRecord, pk=object_id)
    try:
        run_job_match_assessment(version=application.resume_version, application=application, actor=request.user)
        messages.success(request, "ATS job-match assessment created.")
    except ATSAssessmentError as error:
        _safe_error(request, error)
    return redirect("admin:resume_builder_jobapplicationrecord_change", application.pk)


def application_mark_applied_view(request, object_id):
    if request.method != "POST":
        raise PermissionDenied
    if not is_portfolio_admin_user(request.user, require_owner_role=True):
        raise PermissionDenied
    application = get_object_or_404(JobApplicationRecord, pk=object_id)
    export = get_object_or_404(ResumeExport, pk=request.POST.get("resume_export"))
    try:
        mark_application_applied(application=application, export=export, actor=request.user)
        messages.success(request, "Application marked applied.")
    except SnapshotError as error:
        _safe_error(request, error)
    return redirect("admin:resume_builder_jobapplicationrecord_change", application.pk)


def application_advance_view(request, object_id):
    if request.method != "POST" or not is_portfolio_admin_user(request.user, require_owner_role=True):
        raise PermissionDenied
    application = get_object_or_404(JobApplicationRecord, pk=object_id)
    from apps.resume_builder.services import advance_application_status
    try:
        advance_application_status(application=application, status=request.POST.get("status"))
        messages.success(request, "Application status advanced.")
    except SnapshotError as error:
        _safe_error(request, error)
    return redirect("admin:resume_builder_jobapplicationrecord_change", application.pk)


class ResumeVersionWorkflowMixin(OwnerAdminMixin):
    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path("create-draft/", self.admin_site.admin_view(create_draft_view), name="resume_builder_create_draft"),
            path("<path:object_id>/preview/", self.admin_site.admin_view(version_preview_view), name="resume_builder_admin_preview"),
            path("<path:object_id>/edit-content/", self.admin_site.admin_view(content_edit_view), name="resume_builder_edit_content"),
            path("<path:object_id>/freshness/", self.admin_site.admin_view(freshness_view), name="resume_builder_freshness"),
            path("<path:object_id>/ats-readiness/", self.admin_site.admin_view(readiness_assessment_view), name="resume_builder_ats_readiness"),
            path("<path:object_id>/generate-export/<str:format_name>/", self.admin_site.admin_view(generate_export_view), name="resume_builder_generate_export"),
            path("<path:object_id>/download-export/<str:format_name>/", self.admin_site.admin_view(download_export_view), name="resume_builder_download_export"),
            path("<path:object_id>/<str:action>/", self.admin_site.admin_view(action_view), name="resume_builder_version_action"),
        ]
        return custom + urls

    def has_module_permission(self, request):
        return is_portfolio_admin_user(request.user, require_owner_role=True)

    def has_delete_permission(self, request, obj=None):
        return obj is None or (obj.status == ResumeVersion.Status.DRAFT and not obj.applications.exists())


class JobApplicationWorkflowMixin(OwnerAdminMixin):
    def get_urls(self):
        urls = super().get_urls()
        return [
            path("<path:object_id>/mark-applied/", self.admin_site.admin_view(application_mark_applied_view), name="resume_builder_mark_applied"),
            path("<path:object_id>/advance-status/", self.admin_site.admin_view(application_advance_view), name="resume_builder_advance_status"),
            path("<path:object_id>/ats-job-match/", self.admin_site.admin_view(job_match_assessment_view), name="resume_builder_ats_job_match"),
        ] + urls

    def get_form(self, request, obj=None, **kwargs):
        return JobApplicationAdminForm if obj is None or obj.status in {"draft", "saved"} else super().get_form(request, obj, **kwargs)
