from django.db import models

from apps.core.models import TimeStampedModel


class PageSEO(TimeStampedModel):
    page_key = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=120, blank=True)
    title_tag = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    keywords = models.CharField(max_length=500, blank=True)
    og_title = models.CharField(max_length=255, blank=True)
    og_description = models.TextField(blank=True)
    image_alt_text = models.CharField(max_length=255, blank=True)
    canonical_url = models.URLField(blank=True)
    ai_suggested_title = models.CharField(max_length=255, blank=True)
    ai_suggested_description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Page SEO"
        verbose_name_plural = "Page SEO"

    def __str__(self) -> str:
        return self.page_key


class SEOAliasKeyword(TimeStampedModel):
    keyword = models.CharField(max_length=120, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.keyword
