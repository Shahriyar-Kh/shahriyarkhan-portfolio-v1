from django.contrib import admin

from .models import SiteSetting


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ("site_name", "owner_name", "public_email", "updated_at")

    def has_add_permission(self, request):
        # SiteSetting is a true singleton (model.save() always targets pk=1).
        # Hiding the generic Add button prevents an admin from thinking they
        # are creating a second row when they would actually overwrite the
        # canonical settings record.
        return not SiteSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Runtime callers rely on SiteSetting.get_solo(); keep the canonical
        # singleton present and editable rather than deletable/re-creatable.
        return False
