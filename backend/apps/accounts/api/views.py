from django.contrib.auth import login, logout
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.serializers import LoginSerializer, SessionUserSerializer
from apps.accounts.models import UserProfile


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        login(request, user)
        UserProfile.objects.get_or_create(user=user)

        return Response(
            {
                "message": "Login successful.",
                "user": SessionUserSerializer.from_user(user),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response({"user": SessionUserSerializer.from_user(request.user)}, status=status.HTTP_200_OK)
