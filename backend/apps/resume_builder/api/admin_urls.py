from rest_framework.routers import DefaultRouter

from .views import AdminJobApplicationViewSet, AdminResumeVersionViewSet

router = DefaultRouter()
router.register("versions", AdminResumeVersionViewSet, basename="admin-resume-versions")
router.register("applications", AdminJobApplicationViewSet, basename="admin-resume-applications")

urlpatterns = router.urls
