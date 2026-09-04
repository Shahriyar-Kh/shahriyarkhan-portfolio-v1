from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny

from apps.accounts.permissions import IsPortfolioAdmin
from apps.seo.api.serializers import PageSEOSerializer
from apps.seo.models import PageSEO


class PublicPageSEODetailView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = PageSEOSerializer
    queryset = PageSEO.objects.all()
    lookup_field = "page_key"


class AdminPageSEOViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    serializer_class = PageSEOSerializer
    queryset = PageSEO.objects.all()
    search_fields = ("page_key", "title_tag", "meta_description", "keywords")
