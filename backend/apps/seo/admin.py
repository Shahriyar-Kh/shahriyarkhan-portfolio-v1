from django.contrib import admin

from .models import PageSEO, SEOAliasKeyword


@admin.register(PageSEO)
class PageSEOAdmin(admin.ModelAdmin):
    list_display = ("page_key", "title_tag", "updated_at")
    search_fields = ("page_key", "title_tag", "meta_description", "keywords")


@admin.register(SEOAliasKeyword)
class SEOAliasKeywordAdmin(admin.ModelAdmin):
    list_display = ("keyword", "is_active", "updated_at")
    search_fields = ("keyword",)
    list_filter = ("is_active",)
