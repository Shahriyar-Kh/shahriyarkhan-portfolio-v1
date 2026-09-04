from rest_framework import generics, viewsets

from apps.accounts.permissions import IsPortfolioAdmin
from apps.core.models import PublishableModel
from apps.portfolio.api.serializers import (
    AdminExperienceSerializer,
    AdminProjectSerializer,
    AdminServiceSerializer,
    EducationSerializer,
    ExperienceSerializer,
    ProjectSerializer,
    ServiceSerializer,
    SkillSerializer,
)
from apps.portfolio.models import Education, Experience, Project, Service, Skill


class PublicProjectListView(generics.ListAPIView):
    queryset = Project.objects.filter(status=PublishableModel.Status.PUBLISHED)
    serializer_class = ProjectSerializer
    filterset_fields = ("featured",)
    search_fields = ("title", "description", "seo_keywords")
    ordering_fields = ("display_order", "created_at")


class PublicProjectDetailView(generics.RetrieveAPIView):
    queryset = Project.objects.filter(status=PublishableModel.Status.PUBLISHED)
    serializer_class = ProjectSerializer
    lookup_field = "slug"


class PublicExperienceListView(generics.ListAPIView):
    queryset = Experience.objects.filter(status=PublishableModel.Status.PUBLISHED)
    serializer_class = ExperienceSerializer


class PublicSkillListView(generics.ListAPIView):
    queryset = Skill.objects.filter(published=True)
    serializer_class = SkillSerializer
    filterset_fields = ("category",)


class PublicServiceListView(generics.ListAPIView):
    queryset = Service.objects.filter(status=PublishableModel.Status.PUBLISHED)
    serializer_class = ServiceSerializer


class PublicEducationListView(generics.ListAPIView):
    queryset = Education.objects.filter(status=PublishableModel.Status.PUBLISHED)
    serializer_class = EducationSerializer


class AdminProjectViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    queryset = Project.objects.all()
    serializer_class = AdminProjectSerializer
    filterset_fields = ("status", "featured")
    search_fields = ("title", "description", "slug")
    ordering_fields = ("display_order", "created_at", "updated_at")


class AdminExperienceViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    queryset = Experience.objects.all()
    serializer_class = AdminExperienceSerializer


class AdminSkillViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer


class AdminServiceViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    queryset = Service.objects.all()
    serializer_class = AdminServiceSerializer


class AdminEducationViewSet(viewsets.ModelViewSet):
    permission_classes = (IsPortfolioAdmin,)
    queryset = Education.objects.all()
    serializer_class = EducationSerializer
