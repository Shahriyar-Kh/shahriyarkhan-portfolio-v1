from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "is_owner", "timezone", "updated_at")
    search_fields = ("user__username", "user__email", "role")
    list_filter = ("is_owner",)
