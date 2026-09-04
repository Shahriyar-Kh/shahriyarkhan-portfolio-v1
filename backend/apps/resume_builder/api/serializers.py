from rest_framework import serializers

from apps.portfolio.api.serializers import EducationSerializer, ExperienceSerializer, ProjectSerializer, SkillSerializer
from apps.portfolio.models import Education, Experience, Project, Skill
from apps.resume_builder.models import ResumeVersion


class PublicResumeVersionSerializer(serializers.ModelSerializer):
    projects = ProjectSerializer(source="include_projects", many=True, read_only=True)
    experiences = ExperienceSerializer(source="include_experiences", many=True, read_only=True)
    skills = SkillSerializer(source="include_skills", many=True, read_only=True)
    education = EducationSerializer(source="include_education", many=True, read_only=True)

    class Meta:
        model = ResumeVersion
        fields = (
            "id",
            "title",
            "slug",
            "target_role",
            "custom_summary",
            "is_default",
            "ats_tags",
            "projects",
            "experiences",
            "skills",
            "education",
        )


class AdminResumeVersionSerializer(serializers.ModelSerializer):
    include_projects = serializers.PrimaryKeyRelatedField(many=True, queryset=Project.objects.all(), required=False)
    include_experiences = serializers.PrimaryKeyRelatedField(many=True, queryset=Experience.objects.all(), required=False)
    include_skills = serializers.PrimaryKeyRelatedField(many=True, queryset=Skill.objects.all(), required=False)
    include_education = serializers.PrimaryKeyRelatedField(many=True, queryset=Education.objects.all(), required=False)

    class Meta:
        model = ResumeVersion
        fields = "__all__"

    def create(self, validated_data):
        projects = validated_data.pop("include_projects", [])
        experiences = validated_data.pop("include_experiences", [])
        skills = validated_data.pop("include_skills", [])
        education = validated_data.pop("include_education", [])
        resume = super().create(validated_data)
        if projects:
            resume.include_projects.set(projects)
        if experiences:
            resume.include_experiences.set(experiences)
        if skills:
            resume.include_skills.set(skills)
        if education:
            resume.include_education.set(education)
        return resume

    def update(self, instance, validated_data):
        projects = validated_data.pop("include_projects", None)
        experiences = validated_data.pop("include_experiences", None)
        skills = validated_data.pop("include_skills", None)
        education = validated_data.pop("include_education", None)
        resume = super().update(instance, validated_data)
        if projects is not None:
            resume.include_projects.set(projects)
        if experiences is not None:
            resume.include_experiences.set(experiences)
        if skills is not None:
            resume.include_skills.set(skills)
        if education is not None:
            resume.include_education.set(education)
        return resume
