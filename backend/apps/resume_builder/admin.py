from django.contrib import admin

from .models import ResumeExport, ResumeVersion


@admin.register(ResumeVersion)
class ResumeVersionAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "target_role", "is_default", "status", "updated_at")
    list_filter = ("is_default", "status")
    search_fields = ("title", "slug", "target_role", "custom_summary")
    filter_horizontal = ("include_projects", "include_experiences", "include_skills", "include_education")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(ResumeExport)
class ResumeExportAdmin(admin.ModelAdmin):
    list_display = ("resume_version", "format", "created_at")
    list_filter = ("format",)
