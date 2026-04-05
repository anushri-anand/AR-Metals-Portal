from django.urls import path
from .views import AnalyticsAPIView, MHCostAllocationAPIView

urlpatterns = [
    path('analytics/', AnalyticsAPIView.as_view(), name='analytics'),
    path('mh-cost-allocation/', MHCostAllocationAPIView.as_view(), name='mh-cost-allocation'),
]
