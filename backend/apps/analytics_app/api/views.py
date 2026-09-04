from django.db.models import Count
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPortfolioAdmin
from apps.analytics_app.api.serializers import AnalyticsEventSerializer
from apps.analytics_app.models import AnalyticsEvent


class PublicAnalyticsEventCreateView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = AnalyticsEventSerializer
    queryset = AnalyticsEvent.objects.all()


class AdminAnalyticsOverviewView(APIView):
    permission_classes = (IsPortfolioAdmin,)

    def get(self, _request):
        by_type = AnalyticsEvent.objects.values("event_type").annotate(total=Count("id")).order_by("-total")
        top_pages = AnalyticsEvent.objects.values("page_path").annotate(total=Count("id")).order_by("-total")[:10]
        top_projects = (
            AnalyticsEvent.objects.exclude(project__isnull=True)
            .values("project__title")
            .annotate(total=Count("id"))
            .order_by("-total")[:10]
        )
        return Response({"by_type": by_type, "top_pages": top_pages, "top_projects": top_projects})
