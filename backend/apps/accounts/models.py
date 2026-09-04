from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=120, blank=True)
    is_owner = models.BooleanField(default=False)
    timezone = models.CharField(max_length=50, default="UTC")

    def __str__(self) -> str:
        return f"Profile for {self.user.username}"
