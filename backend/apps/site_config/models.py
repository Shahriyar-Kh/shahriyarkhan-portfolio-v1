from django.db import models

from apps.core.models import TimeStampedModel


class SiteSetting(TimeStampedModel):
    site_name = models.CharField(max_length=120, default="Shahriyar Portfolio")
    owner_name = models.CharField(max_length=120, default="Shahriyar Khan")
    public_email = models.EmailField(blank=True)
    public_phone = models.CharField(max_length=40, blank=True)
    public_location = models.CharField(max_length=120, blank=True)
    notification_email = models.EmailField(blank=True)
    hero_title = models.CharField(max_length=255, blank=True)
    hero_subtitle = models.CharField(max_length=500, blank=True)
    default_seo_title = models.CharField(max_length=255, blank=True)
    default_seo_description = models.TextField(blank=True)
    default_keywords = models.CharField(max_length=500, blank=True)
    footer_text = models.CharField(max_length=255, blank=True)
    social_links = models.JSONField(default=dict, blank=True)
    maintenance_mode = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self) -> str:
        return "Site settings"
