from django.contrib import admin
from django.core.exceptions import PermissionDenied
import json

from .admin_workflow import JobApplicationWorkflowMixin, OwnerAdminMixin, ResumeVersionWorkflowMixin
from .models import JobApplicationRecord, ResumeAssessment, ResumeExport, ResumeVersion
from .services import validate_version_snapshot
from .services.exceptions import SnapshotError
from .services.exports import resolve_downloadable_export


@admin.register(ResumeVersion)
class ResumeVersionAdmin(ResumeVersionWorkflowMixin, admin.ModelAdmin):
    change_list_template = "admin/resume_builder/resumeversion/change_list.html"
    change_form_template = "admin/resume_builder/resumeversion/change_form.html"
    list_display = ("title", "resume_type", "status", "is_default", "public_delivery_health", "target_role", "target_organization", "created_at", "approved_at", "published_at")
    list_filter = ("resume_type", "status", "is_default", "created_at", "published_at")
    search_fields = ("title", "slug", "target_role", "target_organization")
    filter_horizontal = ("include_projects", "include_experiences", "include_skills", "include_education", "include_certifications")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = (
        "version_uuid",
        "source_hash",
        "approved_at",
        "archived_at",
        "published_at",
        "created_by",
        "approved_by",
        "published_by",
        "created_at",
        "updated_at",
        "resume_content_hash",
        "public_delivery_health",
    )
    fieldsets = (
        ("Identity", {"fields": ("title", "slug", "resume_type", "version_uuid")}),
        ("Target", {"fields": ("target_role", "target_organization", "custom_summary")}),
        ("Portfolio selections", {"fields": ("include_projects", "include_experiences", "include_skills", "include_education", "include_certifications")}),
        ("Snapshot integrity", {"fields": ("snapshot_schema_version", "source_hash", "resume_content_hash", "source_facts_preview", "resume_content_preview"), "classes": ("collapse",)}),
        ("Governance", {"fields": ("status", "is_default", "public_delivery_health", "created_by", "approved_by", "published_by", "approved_at", "published_at", "archived_at")}),
        ("History", {"fields": ("created_at", "updated_at")}),
    )

    def get_readonly_fields(self, request, obj=None):
        fields = set(super().get_readonly_fields(request, obj)) | {"source_facts_preview", "resume_content_preview"}
        if obj and (obj.status != ResumeVersion.Status.DRAFT or obj.source_hash):
            # A stored snapshot is governed even while the version is still a
            # draft. Editing model fields or selections directly would leave
            # source_facts/resume_content hashes stale and the M2M guards would
            # reject selection changes anyway. Use the dedicated wording and
            # workflow actions instead.
            fields.update(field.name for field in ResumeVersion._meta.fields)
            fields.update(("include_projects", "include_experiences", "include_skills", "include_education", "include_certifications"))
        return tuple(fields)

    def get_prepopulated_fields(self, request, obj=None):
        # Django's prepopulation JS expects both the target (slug) and its
        # dependency (title) to be editable form fields. Approved/published/
        # archived resume versions are intentionally rendered fully read-only,
        # so leaving prepopulated_fields enabled makes AdminForm index an empty
        # ModelForm and raises KeyError('slug'). Existing versions do not need
        # slug prepopulation anyway; it is useful only while creating a row.
        if obj is not None:
            return {}
        return super().get_prepopulated_fields(request, obj)

    @admin.display(description="Source facts preview")
    def source_facts_preview(self, obj):
        return json.dumps(obj.source_facts or {}, ensure_ascii=False, sort_keys=True, indent=2)

    @admin.display(description="Résumé content preview")
    def resume_content_preview(self, obj):
        return json.dumps(obj.resume_content or {}, ensure_ascii=False, sort_keys=True, indent=2)

    @admin.display(description="Public delivery")
    def public_delivery_health(self, obj):
        if not obj:
            return "Not available"
        if not (
            obj.resume_type == ResumeVersion.ResumeType.MASTER
            and obj.status == ResumeVersion.Status.PUBLISHED
            and obj.is_default
        ):
            return "Not public"
        try:
            validate_version_snapshot(obj)
        except SnapshotError:
            return "BROKEN — snapshot invalid"
        pdf_ok = resolve_downloadable_export(obj, ResumeExport.Format.PDF) is not None
        docx_ok = resolve_downloadable_export(obj, ResumeExport.Format.DOCX) is not None
        if pdf_ok and docx_ok:
            return "Healthy — page + PDF + DOCX"
        missing = []
        if not pdf_ok:
            missing.append("PDF")
        if not docx_ok:
            missing.append("DOCX")
        return f"BROKEN — missing/invalid {' + '.join(missing)}"

    def change_view(self, request, object_id, form_url="", extra_context=None):
        context = dict(extra_context or {})
        version = self.get_object(request, object_id)
        context["has_pdf_export"] = bool(
            version and resolve_downloadable_export(version, ResumeExport.Format.PDF)
        )
        context["has_docx_export"] = bool(
            version and resolve_downloadable_export(version, ResumeExport.Format.DOCX)
        )
        return super().change_view(request, object_id, form_url, context)

    def has_delete_permission(self, request, obj=None):
        return obj is None or (obj.status == ResumeVersion.Status.DRAFT and not obj.applications.exists())

    def delete_view(self, request, object_id, extra_context=None):
        obj = self.get_object(request, object_id)
        if obj is not None and not self.has_delete_permission(request, obj):
            raise PermissionDenied
        return super().delete_view(request, object_id, extra_context)


@admin.register(ResumeExport)
class ResumeExportAdmin(OwnerAdminMixin, admin.ModelAdmin):
    list_display = ("resume_version", "format", "status", "byte_size", "content_hash", "sha256", "generated_at")
    list_filter = ("format", "status")
    fields = ("resume_version", "format", "file", "download_count_snapshot", "status", "content_hash", "sha256", "byte_size", "generated_at", "generation_error", "created_at", "updated_at")
    readonly_fields = (
        "status",
        "content_hash",
        "sha256",
        "binary_content",
        "byte_size",
        "generated_at",
        "generation_error",
        "created_at",
        "updated_at",
    )

    def get_queryset(self, request):
        return super().get_queryset(request).defer("binary_content")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(JobApplicationRecord)
class JobApplicationRecordAdmin(JobApplicationWorkflowMixin, admin.ModelAdmin):
    list_display = ("organization", "job_title", "status", "resume_version", "submitted_format", "application_date", "follow_up_date")
    list_filter = ("status", "submitted_format", "application_date", "follow_up_date")
    search_fields = ("organization", "job_title", "job_url")
    readonly_fields = ("record_uuid", "resume_export", "submitted_format", "submitted_artifact_sha256", "application_date", "created_at", "updated_at")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("resume_version", "resume_export")

    def get_readonly_fields(self, request, obj=None):
        fields = set(self.readonly_fields)
        if obj and obj.status in {"applied", "interviewing", "offer", "rejected", "withdrawn"}:
            fields.update(("organization", "job_title", "job_url", "job_description_snapshot", "job_description_hash", "resume_version"))
        return tuple(fields)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ResumeAssessment)
class ResumeAssessmentAdmin(OwnerAdminMixin, admin.ModelAdmin):
    list_display = ("resume_version", "assessment_type", "score", "ruleset_version", "created_at")
    list_filter = ("assessment_type", "ruleset_version", "created_at")
    search_fields = ("resume_version__title", "resume_version__slug")
    readonly_fields = tuple(field.name for field in ResumeAssessment._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
