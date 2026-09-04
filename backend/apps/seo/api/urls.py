from django.urls import path

from .views import PublicPageSEODetailView

urlpatterns = [
    path("pages/<str:page_key>/", PublicPageSEODetailView.as_view(), name="public_page_seo"),
]
