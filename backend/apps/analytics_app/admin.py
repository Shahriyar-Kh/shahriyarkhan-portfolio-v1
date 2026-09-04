from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "page_path", "project", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("page_path", "session_id", "ip_hash")
