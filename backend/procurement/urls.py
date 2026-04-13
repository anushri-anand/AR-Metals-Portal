from django.urls import path

from .views import (
    PaymentEntryCreateAPIView,
    PaymentEntryListAPIView,
    PaymentEntryUpdateAPIView,
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

    path('payment/entry/', PaymentEntryCreateAPIView.as_view(), name='payment-entry'),
    path('payment/update/', PaymentEntryUpdateAPIView.as_view(), name='payment-update'),
    path('payment/', PaymentEntryListAPIView.as_view(), name='payment-list'),
]
