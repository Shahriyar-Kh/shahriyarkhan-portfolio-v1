from rest_framework.routers import DefaultRouter

from .views import (
    AdminEducationViewSet,
    AdminExperienceViewSet,
    AdminProjectViewSet,
    AdminServiceViewSet,
    AdminSkillViewSet,
)

router = DefaultRouter()
router.register("projects", AdminProjectViewSet, basename="admin-projects")
router.register("experiences", AdminExperienceViewSet, basename="admin-experiences")
router.register("skills", AdminSkillViewSet, basename="admin-skills")
router.register("services", AdminServiceViewSet, basename="admin-services")
router.register("education", AdminEducationViewSet, basename="admin-education")

urlpatterns = router.urls
