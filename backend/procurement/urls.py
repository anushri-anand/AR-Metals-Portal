from django.urls import path

from .views import (
    AssetDepositEntryAPIView,
    AssetDepositListAPIView,
    BurReportSnapshotAPIView,
    BurReportSnapshotApproveAPIView,
    BurReportSnapshotRejectAPIView,
    DividendInvestmentEntryAPIView,
    DividendInvestmentListAPIView,
    GlPeriodClosingAPIView,
    GlPeriodClosingApproveAPIView,
    InventoryIssuanceEntryAPIView,
    InventoryIssuanceListAPIView,
    InventoryRelevantCostAllocationAPIView,
    PaymentEntryCreateAPIView,
    PaymentEntryListAPIView,
    PaymentEntryUpdateAPIView,
    PettyCashVoucherEntryAPIView,
    PettyCashVoucherListAPIView,
    PcrReportSnapshotAPIView,
    PcrReportSnapshotApproveAPIView,
    PurchaseOrderApproveAPIView,
    PurchaseOrderEntryAPIView,
    PurchaseOrderListAPIView,
    VendorEntryAPIView,
    VendorListAPIView,
)

urlpatterns = [
    path('vendor-data/entry/', VendorEntryAPIView.as_view(), name='vendor-entry'),
    path('vendor-data/', VendorListAPIView.as_view(), name='vendor-list'),

    path('purchase-order/entry/', PurchaseOrderEntryAPIView.as_view(), name='purchase-order-entry'),
    path('purchase-order/', PurchaseOrderListAPIView.as_view(), name='purchase-order-list'),
    path(
        'purchase-order/<int:pk>/approve/',
        PurchaseOrderApproveAPIView.as_view(),
        name='purchase-order-approve',
    ),

    path('payment/entry/', PaymentEntryCreateAPIView.as_view(), name='payment-entry'),
    path('payment/update/', PaymentEntryUpdateAPIView.as_view(), name='payment-update'),
    path('payment/', PaymentEntryListAPIView.as_view(), name='payment-list'),

    path(
        'inventory-issuance/entry/',
        InventoryIssuanceEntryAPIView.as_view(),
        name='inventory-issuance-entry',
    ),
    path(
        'inventory-issuance/',
        InventoryIssuanceListAPIView.as_view(),
        name='inventory-issuance-list',
    ),
    path(
        'inventory-relevant-cost/',
        InventoryRelevantCostAllocationAPIView.as_view(),
        name='inventory-relevant-cost',
    ),

    path('petty-cash/entry/', PettyCashVoucherEntryAPIView.as_view(), name='petty-cash-entry'),
    path('petty-cash/', PettyCashVoucherListAPIView.as_view(), name='petty-cash-list'),
    path('asset-deposits/entry/', AssetDepositEntryAPIView.as_view(), name='asset-deposit-entry'),
    path('asset-deposits/', AssetDepositListAPIView.as_view(), name='asset-deposit-list'),
    path(
        'dividend-investment/entry/',
        DividendInvestmentEntryAPIView.as_view(),
        name='dividend-investment-entry',
    ),
    path(
        'dividend-investment/',
        DividendInvestmentListAPIView.as_view(),
        name='dividend-investment-list',
    ),
    path('gl-period-closing/', GlPeriodClosingAPIView.as_view(), name='gl-period-closing'),
    path(
        'gl-period-closing/<int:pk>/approve/',
        GlPeriodClosingApproveAPIView.as_view(),
        name='gl-period-closing-approve',
    ),
    path('pcr/', PcrReportSnapshotAPIView.as_view(), name='pcr-report-snapshot'),
    path(
        'pcr/<int:pk>/approve/',
        PcrReportSnapshotApproveAPIView.as_view(),
        name='pcr-report-snapshot-approve',
    ),
    path('bur/', BurReportSnapshotAPIView.as_view(), name='bur-report-snapshot'),
    path(
        'bur/<int:pk>/approve/',
        BurReportSnapshotApproveAPIView.as_view(),
        name='bur-report-snapshot-approve',
    ),
    path(
        'bur/<int:pk>/reject/',
        BurReportSnapshotRejectAPIView.as_view(),
        name='bur-report-snapshot-reject',
    ),
]
