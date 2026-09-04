from rest_framework import serializers

from apps.seo.models import SEOAliasKeyword, PageSEO


class PageSEOSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageSEO
        fields = "__all__"


class SEOAliasKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SEOAliasKeyword
        fields = "__all__"
