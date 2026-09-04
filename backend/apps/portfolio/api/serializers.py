from rest_framework import serializers

from apps.portfolio.models import Education, Experience, Project, Service, Skill, SkillCategory, Technology


class TechnologySerializer(serializers.ModelSerializer):
    class Meta:
        model = Technology
        fields = ("id", "name", "slug")


class ProjectSerializer(serializers.ModelSerializer):
    technologies = TechnologySerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = "__all__"


class AdminProjectSerializer(serializers.ModelSerializer):
    technologies = serializers.PrimaryKeyRelatedField(many=True, queryset=Technology.objects.all(), required=False)

    class Meta:
        model = Project
        fields = "__all__"

    def create(self, validated_data):
        technologies = validated_data.pop("technologies", [])
        project = super().create(validated_data)
        if technologies:
            project.technologies.set(technologies)
        return project

    def update(self, instance, validated_data):
        technologies = validated_data.pop("technologies", None)
        project = super().update(instance, validated_data)
        if technologies is not None:
            project.technologies.set(technologies)
        return project


class ExperienceSerializer(serializers.ModelSerializer):
    technologies = TechnologySerializer(many=True, read_only=True)

    class Meta:
        model = Experience
        fields = "__all__"


class AdminExperienceSerializer(serializers.ModelSerializer):
    technologies = serializers.PrimaryKeyRelatedField(many=True, queryset=Technology.objects.all(), required=False)

    class Meta:
        model = Experience
        fields = "__all__"

    def create(self, validated_data):
        technologies = validated_data.pop("technologies", [])
        experience = super().create(validated_data)
        if technologies:
            experience.technologies.set(technologies)
        return experience

    def update(self, instance, validated_data):
        technologies = validated_data.pop("technologies", None)
        experience = super().update(instance, validated_data)
        if technologies is not None:
            experience.technologies.set(technologies)
        return experience


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = "__all__"


class SkillSerializer(serializers.ModelSerializer):
    category = SkillCategorySerializer(read_only=True)

    class Meta:
        model = Skill
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class AdminServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = "__all__"
