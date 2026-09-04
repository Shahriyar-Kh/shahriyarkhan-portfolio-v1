from django.db import models

from apps.core.models import TimeStampedModel
from apps.portfolio.models import Service


class ContactMessage(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        READ = "read", "Read"
        REPLIED = "replied", "Replied"
        ARCHIVED = "archived", "Archived"

    sender_name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    service_type_text = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.sender_name} - {self.subject}"


class ServiceRequest(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In Progress"
        CLOSED = "closed", "Closed"

    sender_name = models.CharField(max_length=150)
    email = models.EmailField()
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name="service_requests")
    service_type_text = models.CharField(max_length=255, blank=True)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    budget_range = models.CharField(max_length=120, blank=True)
    timeline = models.CharField(max_length=120, blank=True)
    source_page = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.sender_name} - {self.subject}"
