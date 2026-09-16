from rest_framework import serializers

from django.conf import settings


class AssistantQuerySerializer(serializers.Serializer):
    message = serializers.CharField(trim_whitespace=True)
    session_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64, default=None)

    def validate_message(self, value: str) -> str:
        max_length = getattr(settings, "ASSISTANT_MAX_MESSAGE_LENGTH", 600)
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(stripped) > max_length:
            raise serializers.ValidationError(f"Message must be at most {max_length} characters.")
        return stripped
