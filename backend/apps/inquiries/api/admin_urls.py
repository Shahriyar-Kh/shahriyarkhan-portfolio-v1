from rest_framework.routers import DefaultRouter

from .views import AdminContactMessageViewSet, AdminServiceRequestViewSet

router = DefaultRouter()
router.register("contact-messages", AdminContactMessageViewSet, basename="admin-contact-messages")
router.register("service-requests", AdminServiceRequestViewSet, basename="admin-service-requests")

urlpatterns = router.urls
