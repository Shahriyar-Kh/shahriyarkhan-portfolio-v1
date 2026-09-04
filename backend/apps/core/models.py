from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PublishableModel(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        abstract = True


class OrderedModel(models.Model):
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True


class SEOMetadataModel(models.Model):
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    seo_keywords = models.CharField(max_length=500, blank=True)
    og_title = models.CharField(max_length=255, blank=True)
    og_description = models.TextField(blank=True)
    image_alt_text = models.CharField(max_length=255, blank=True)

    class Meta:
        abstract = True
