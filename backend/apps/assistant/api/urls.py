from django.urls import path

from .views import PublicAssistantQueryView

urlpatterns = [
    path("query/", PublicAssistantQueryView.as_view(), name="public_assistant_query"),
]
