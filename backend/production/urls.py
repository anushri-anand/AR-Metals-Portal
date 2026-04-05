from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductionEntryViewSet, DeliveryEntryViewSet, ProductionStatusAPIView

router = DefaultRouter()
router.register(r'production-entries', ProductionEntryViewSet, basename='production-entry')
router.register(r'delivery-entries', DeliveryEntryViewSet, basename='delivery-entry')

urlpatterns = router.urls + [
    path('status/', ProductionStatusAPIView.as_view(), name='production-status'),
]
