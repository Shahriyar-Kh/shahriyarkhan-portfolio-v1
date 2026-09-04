from django.contrib import admin

from .models import Education, Experience, Project, Service, Skill, SkillCategory, Technology


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "featured", "display_order", "updated_at")
    list_filter = ("status", "featured", "technologies")
    search_fields = ("title", "slug", "description")
    filter_horizontal = ("technologies",)
    prepopulated_fields = {"slug": ("title",)}
    actions = ("make_published", "make_draft")

    @admin.action(description="Mark selected projects as published")
    def make_published(self, _request, queryset):
        queryset.update(status="published")

    @admin.action(description="Mark selected projects as draft")
    def make_draft(self, _request, queryset):
        queryset.update(status="draft")


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ("company_name", "role_title", "start_date", "end_date", "current_role")
    list_filter = ("current_role", "status")
    search_fields = ("company_name", "role_title", "description")
    filter_horizontal = ("technologies",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "level", "published", "display_order")
    list_filter = ("category", "published", "level")
    search_fields = ("name", "description")


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "display_order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "featured", "display_order")
    list_filter = ("status", "featured")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Technology)
class TechnologyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "updated_at")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ("institution", "degree", "start_date", "end_date", "status")
    list_filter = ("status",)
    search_fields = ("institution", "degree")
