from django.db import models

from apps.core.models import PublishableModel, TimeStampedModel
from apps.portfolio.models import Education, Experience, Project, Skill


class ResumeVersion(TimeStampedModel, PublishableModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    target_role = models.CharField(max_length=150, blank=True)
    custom_summary = models.TextField(blank=True)
    include_projects = models.ManyToManyField(Project, blank=True)
    include_experiences = models.ManyToManyField(Experience, blank=True)
    include_skills = models.ManyToManyField(Skill, blank=True)
    include_education = models.ManyToManyField(Education, blank=True)
    is_default = models.BooleanField(default=False)
    ats_tags = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return self.title


class ResumeExport(TimeStampedModel):
    class Format(models.TextChoices):
        PDF = "pdf", "PDF"
        JSON = "json", "JSON"
        HTML = "html", "HTML"

    resume_version = models.ForeignKey(ResumeVersion, on_delete=models.CASCADE, related_name="exports")
    format = models.CharField(max_length=8, choices=Format.choices)
    file = models.FileField(upload_to="resume_exports/", blank=True, null=True)
    download_count_snapshot = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-created_at",)
