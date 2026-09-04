from django.db import models

from apps.core.models import TimeStampedModel
from apps.portfolio.models import Project


class AnalyticsEvent(TimeStampedModel):
    class EventType(models.TextChoices):
        PAGE_VISIT = "page_visit", "Page Visit"
        PROJECT_VIEW = "project_view", "Project View"
        PROJECT_CLICK = "project_click", "Project Click"
        CONTACT_SUBMIT = "contact_submit", "Contact Submit"
        SERVICE_REQUEST_SUBMIT = "service_request_submit", "Service Request Submit"
        RESUME_DOWNLOAD = "resume_download", "Resume Download"

    event_type = models.CharField(max_length=30, choices=EventType.choices)
    page_path = models.CharField(max_length=255, blank=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="analytics_events")
    metadata = models.JSONField(default=dict, blank=True)
    session_id = models.CharField(max_length=128, blank=True)
    ip_hash = models.CharField(max_length=128, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["event_type", "created_at"]), models.Index(fields=["page_path"])]
