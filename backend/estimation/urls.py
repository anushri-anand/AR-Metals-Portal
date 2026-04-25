from django.urls import path

from .views import (
    BomalReportAPIView,
    BoqItemBulkSaveAPIView,
    BoqItemDetailAPIView,
    BoqItemImportAPIView,
    BoqItemListAPIView,
    ClientDataAPIView,
    ClientDataDetailAPIView,
    CostingRevisionSnapshotAPIView,
    CostingRevisionSnapshotApproveAPIView,
    ContractPaymentLogAPIView,
    ContractRevenueAPIView,
    ContractRevenueDetailAPIView,
    ContractVariationLogAPIView,
    MasterListAPIView,
    MasterListDetailAPIView,
    TenderLogAPIView,
    TenderLogDetailAPIView,
    TenderCostingDetailAPIView,
    TenderCostingListAPIView,
)

urlpatterns = [
    path('client-data/', ClientDataAPIView.as_view(), name='estimation-client-data'),
    path(
        'client-data/<int:pk>/',
        ClientDataDetailAPIView.as_view(),
        name='estimation-client-data-detail',
    ),
    path('tender-log/', TenderLogAPIView.as_view(), name='estimation-tender-log'),
    path(
        'tender-log/<int:pk>/',
        TenderLogDetailAPIView.as_view(),
        name='estimation-tender-log-detail',
    ),
    path('master-list/', MasterListAPIView.as_view(), name='estimation-master-list'),
    path(
        'master-list/<int:pk>/',
        MasterListDetailAPIView.as_view(),
        name='estimation-master-list-detail',
    ),
    path(
        'contract/revenue/',
        ContractRevenueAPIView.as_view(),
        name='estimation-contract-revenue',
    ),
    path(
        'contract/revenue/<int:pk>/',
        ContractRevenueDetailAPIView.as_view(),
        name='estimation-contract-revenue-detail',
    ),
    path(
        'contract/variation-log/',
        ContractVariationLogAPIView.as_view(),
        name='estimation-contract-variation-log',
    ),
    path(
        'contract/payment-log/',
        ContractPaymentLogAPIView.as_view(),
        name='estimation-contract-payment-log',
    ),
    path('boq-items/', BoqItemListAPIView.as_view(), name='estimation-boq-items'),
    path(
        'boq-items/bulk-save/',
        BoqItemBulkSaveAPIView.as_view(),
        name='estimation-boq-items-bulk-save',
    ),
    path(
        'boq-items/import/',
        BoqItemImportAPIView.as_view(),
        name='estimation-boq-items-import',
    ),
    path(
        'boq-items/<int:pk>/',
        BoqItemDetailAPIView.as_view(),
        name='estimation-boq-item-detail',
    ),
    path('costings/', TenderCostingListAPIView.as_view(), name='estimation-costings'),
    path(
        'costings/<int:boq_item_id>/',
        TenderCostingDetailAPIView.as_view(),
        name='estimation-costing-detail',
    ),
    path(
        'costing-snapshots/',
        CostingRevisionSnapshotAPIView.as_view(),
        name='estimation-costing-snapshots',
    ),
    path(
        'costing-snapshots/<int:pk>/approve/',
        CostingRevisionSnapshotApproveAPIView.as_view(),
        name='estimation-costing-snapshot-approve',
    ),
    path('bomal/', BomalReportAPIView.as_view(), name='estimation-bomal'),
]
