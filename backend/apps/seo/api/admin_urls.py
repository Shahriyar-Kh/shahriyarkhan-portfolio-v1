from rest_framework.routers import DefaultRouter

from .views import AdminPageSEOViewSet

router = DefaultRouter()
router.register("pages", AdminPageSEOViewSet, basename="admin-page-seo")

urlpatterns = router.urls
