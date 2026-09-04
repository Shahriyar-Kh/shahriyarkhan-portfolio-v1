from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import UserProfile


User = get_user_model()


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    profile, _ = UserProfile.objects.get_or_create(user=instance)

    if created and instance.is_superuser:
        profile.is_owner = True
        if not profile.role:
            profile.role = "owner"
        profile.save(update_fields=["is_owner", "role", "updated_at"])
