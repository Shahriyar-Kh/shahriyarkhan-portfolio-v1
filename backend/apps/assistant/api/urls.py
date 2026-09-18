from django.urls import path

from .views import PublicAssistantQueryView, PublicProjectDiscoveryAnalysisView

urlpatterns = [
    path("query/", PublicAssistantQueryView.as_view(), name="public_assistant_query"),
    path(
        "project-discovery-analysis/",
        PublicProjectDiscoveryAnalysisView.as_view(),
        name="public_project_discovery_analysis",
    ),
]
