from django.db import models

from apps.core.models import OrderedModel, PublishableModel, SEOMetadataModel, TimeStampedModel


class Technology(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)

    def __str__(self) -> str:
        return self.name


class Project(TimeStampedModel, PublishableModel, OrderedModel, SEOMetadataModel):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    description = models.TextField()
    technologies = models.ManyToManyField(Technology, blank=True, related_name="projects")
    live_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    preview_image = models.ImageField(upload_to="projects/previews/", blank=True, null=True)
    featured_image = models.ImageField(upload_to="projects/featured/", blank=True, null=True)
    alt_text = models.CharField(max_length=255, blank=True)
    ai_summary = models.TextField(blank=True)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ("display_order", "-created_at")

    def __str__(self) -> str:
        return self.title


class Experience(TimeStampedModel, OrderedModel, SEOMetadataModel):
    company_name = models.CharField(max_length=255)
    role_title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    achievements = models.JSONField(default=list, blank=True)
    technologies = models.ManyToManyField(Technology, blank=True, related_name="experiences")
    current_role = models.BooleanField(default=False)
    status = models.CharField(
        max_length=12,
        choices=PublishableModel.Status.choices,
        default=PublishableModel.Status.PUBLISHED,
    )

    class Meta:
        ordering = ("-start_date", "display_order")

    def __str__(self) -> str:
        return f"{self.role_title} at {self.company_name}"


class SkillCategory(OrderedModel, TimeStampedModel):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Skill categories"
        ordering = ("display_order", "name")

    def __str__(self) -> str:
        return self.name


class Skill(OrderedModel, TimeStampedModel):
    class Level(models.IntegerChoices):
        BEGINNER = 1, "Beginner"
        INTERMEDIATE = 2, "Intermediate"
        ADVANCED = 3, "Advanced"
        EXPERT = 4, "Expert"

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    level = models.PositiveSmallIntegerField(choices=Level.choices, default=Level.INTERMEDIATE)
    icon_or_badge = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(SkillCategory, on_delete=models.PROTECT, related_name="skills")
    published = models.BooleanField(default=True)

    class Meta:
        ordering = ("display_order", "name")
        unique_together = (("name", "category"),)

    def __str__(self) -> str:
        return self.name


class Service(TimeStampedModel, PublishableModel, OrderedModel, SEOMetadataModel):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    description = models.TextField()
    deliverables = models.JSONField(default=list, blank=True)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ("display_order", "title")

    def __str__(self) -> str:
        return self.title


class Education(TimeStampedModel, PublishableModel, OrderedModel):
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("-start_date", "display_order")

    def __str__(self) -> str:
        return f"{self.degree} - {self.institution}"
