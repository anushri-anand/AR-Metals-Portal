from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import WorkEntryViewSet, PendingHoursListAPIView, UpdateHoursAPIView, LabourStatusAPIView

router = DefaultRouter()
router.register(r'work-entries', WorkEntryViewSet, basename='work-entry')

urlpatterns = router.urls + [
    path('pending-hours/', PendingHoursListAPIView.as_view(), name='pending-hours'),
    path('pending-hours/<int:pk>/update/', UpdateHoursAPIView.as_view(), name='update-hours'),
    path('labour-status/', LabourStatusAPIView.as_view(), name='labour-status'),
]
