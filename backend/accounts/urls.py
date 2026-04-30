from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    ApprovalRequestApproveAPIView,
    ApprovalRequestListCreateAPIView,
    ApprovalRequestRejectAPIView,
    MeAPIView,
)

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeAPIView.as_view(), name='me'),
    path('approval-requests/', ApprovalRequestListCreateAPIView.as_view(), name='approval-request-list-create'),
    path(
        'approval-requests/<int:pk>/approve/',
        ApprovalRequestApproveAPIView.as_view(),
        name='approval-request-approve',
    ),
    path(
        'approval-requests/<int:pk>/reject/',
        ApprovalRequestRejectAPIView.as_view(),
        name='approval-request-reject',
    ),
]
