from django.urls import path

from .views import PublicDefaultResumeView, PublicResumeBySlugView, PublicResumeDefaultDownloadView, PublicResumeDownloadTrackView

urlpatterns = [
    path("default/", PublicDefaultResumeView.as_view(), name="public_resume_default"),
    path("default/download/<str:format_name>/", PublicResumeDefaultDownloadView.as_view(), name="public_resume_default_download"),
    path("<slug:slug>/", PublicResumeBySlugView.as_view(), name="public_resume_by_slug"),
    path("<slug:slug>/download-track/", PublicResumeDownloadTrackView.as_view(), name="public_resume_download_track"),
]
