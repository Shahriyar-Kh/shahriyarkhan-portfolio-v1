from rest_framework.routers import DefaultRouter

from .views import AdminResumeVersionViewSet

router = DefaultRouter()
router.register("versions", AdminResumeVersionViewSet, basename="admin-resume-versions")

urlpatterns = router.urls
