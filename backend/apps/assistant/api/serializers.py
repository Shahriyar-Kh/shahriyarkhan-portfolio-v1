from rest_framework import serializers

from django.conf import settings


class AssistantQuerySerializer(serializers.Serializer):
    message = serializers.CharField(trim_whitespace=True)
    session_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64, default=None)
    # Browser-held recent visitor messages only. This gives short follow-up
    # questions enough topic context without persisting a chat transcript on
    # the server. Assistant answers are intentionally not accepted here.
    context = serializers.ListField(
        child=serializers.CharField(trim_whitespace=True, max_length=600),
        required=False,
        default=list,
        max_length=4,
    )

    def validate_message(self, value: str) -> str:
        max_length = getattr(settings, "ASSISTANT_MAX_MESSAGE_LENGTH", 600)
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(stripped) > max_length:
            raise serializers.ValidationError(f"Message must be at most {max_length} characters.")
        return stripped


class ProjectDiscoveryAnalysisSerializer(serializers.Serializer):
    description = serializers.CharField(trim_whitespace=True, max_length=2000)

    def validate_description(self, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 10:
            raise serializers.ValidationError("Describe the project in a little more detail.")
        return stripped
