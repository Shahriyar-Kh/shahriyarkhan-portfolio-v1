from django.urls import path

from .views import PublicDefaultResumeView, PublicResumeBySlugView, PublicResumeDownloadTrackView

urlpatterns = [
    path("default/", PublicDefaultResumeView.as_view(), name="public_resume_default"),
    path("<slug:slug>/", PublicResumeBySlugView.as_view(), name="public_resume_by_slug"),
    path("<slug:slug>/download-track/", PublicResumeDownloadTrackView.as_view(), name="public_resume_download_track"),
]
