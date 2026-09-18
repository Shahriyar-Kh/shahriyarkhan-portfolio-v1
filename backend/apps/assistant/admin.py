from django.contrib import admin

from apps.assistant.models import AssistantUsageBucket


@admin.register(AssistantUsageBucket)
class AssistantUsageBucketAdmin(admin.ModelAdmin):
    """Read-only - these rows exist only for anonymous abuse visibility
    (PORTFOLIO-ASSISTANTS-01 section 10); there is nothing here to edit,
    and no visitor conversation content is ever stored to display."""

    list_display = ("anonymous_key_hash", "bucket_date", "request_count", "blocked_count", "updated_at")
    list_filter = ("bucket_date",)
    search_fields = ("anonymous_key_hash",)
    ordering = ("-bucket_date",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
