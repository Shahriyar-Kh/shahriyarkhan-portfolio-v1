from django.contrib.auth import authenticate
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(request=request, username=attrs.get("username"), password=attrs.get("password"))

        if user is None:
            raise serializers.ValidationError("Invalid username or password.")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        attrs["user"] = user
        return attrs


class SessionUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()
    role = serializers.CharField(allow_blank=True)
    is_owner = serializers.BooleanField()

    @staticmethod
    def from_user(user):
        profile = getattr(user, "profile", None)
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "role": getattr(profile, "role", "") if profile else "",
            "is_owner": bool(getattr(profile, "is_owner", False)) if profile else False,
        }
