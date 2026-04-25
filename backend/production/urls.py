from django.urls import path

from .views import (
    DeliveryEntryAPIView,
    ProjectDetailEntryAPIView,
    ProjectDetailListAPIView,
    ProjectTenderOptionsAPIView,
    ProjectDetailUpdateAPIView,
    ProjectOptionsAPIView,
    ProductionStatusBreakdownAPIView,
    ProductionStatusSummaryAPIView,
    ProjectVariationAPIView,
    TimeAllocationEntryAPIView,
    TimeAllocationListAPIView,
    WorkCompletionEntryAPIView,
)

urlpatterns = [
    path('project-details/options/', ProjectOptionsAPIView.as_view(), name='project-options'),
    path(
        'project-details/tender-options/',
        ProjectTenderOptionsAPIView.as_view(),
        name='project-tender-options',
    ),
    path('project-details/entry/', ProjectDetailEntryAPIView.as_view(), name='project-detail-entry'),
    path('project-details/update/', ProjectDetailUpdateAPIView.as_view(), name='project-detail-update'),
    path('project-details/', ProjectDetailListAPIView.as_view(), name='project-detail-list'),
    path('project-details/variation/', ProjectVariationAPIView.as_view(), name='project-variation'),
    path('time-allocation/entry/', TimeAllocationEntryAPIView.as_view(), name='time-allocation-entry'),
    path('time-allocation/', TimeAllocationListAPIView.as_view(), name='time-allocation-list'),
    path(
        'status/work-completion/entry/',
        WorkCompletionEntryAPIView.as_view(),
        name='work-completion-entry',
    ),
    path(
        'status/delivery/entry/',
        DeliveryEntryAPIView.as_view(),
        name='delivery-entry',
    ),
    path(
        'status/view/summary/',
        ProductionStatusSummaryAPIView.as_view(),
        name='production-status-summary',
    ),
    path(
        'status/view/breakdown/',
        ProductionStatusBreakdownAPIView.as_view(),
        name='production-status-breakdown',
    ),
]
