from django.urls import path

from apps.accounts.api.views import LoginView, LogoutView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth_login"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
    path("me/", MeView.as_view(), name="auth_me"),
]
