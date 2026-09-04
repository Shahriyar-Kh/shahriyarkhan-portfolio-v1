from django.urls import path

from .views import (
    PublicEducationListView,
    PublicExperienceListView,
    PublicProjectDetailView,
    PublicProjectListView,
    PublicServiceListView,
    PublicSkillListView,
)

urlpatterns = [
    path("projects/", PublicProjectListView.as_view(), name="public_projects"),
    path("projects/<slug:slug>/", PublicProjectDetailView.as_view(), name="public_project_detail"),
    path("experiences/", PublicExperienceListView.as_view(), name="public_experiences"),
    path("skills/", PublicSkillListView.as_view(), name="public_skills"),
    path("services/", PublicServiceListView.as_view(), name="public_services"),
    path("education/", PublicEducationListView.as_view(), name="public_education"),
]
