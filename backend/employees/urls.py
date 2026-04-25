from django.urls import path

from .views import (
    AnnualLeaveCreateAPIView,
    AssociatedCostEntryAPIView,
    AssociatedCostEntryListAPIView,
    AssociatedCostPaymentEntryAPIView,
    AssociatedCostPaymentListAPIView,
    EmployeeDetailEntryAPIView,
    EmployeeDetailHistoryAPIView,
    EmployeeDetailUpdateAPIView,
    EmployeeOptionsAPIView,
    PayrollGenerateAPIView,
    PayrollPreviewAPIView,
    PublicHolidayDateListAPIView,
    SalaryActualIncurredCostAPIView,
    SalaryAdvanceCreateAPIView,
    TimeEntryCreateAPIView,
    TimeEntryListAPIView,
)

urlpatterns = [
    path('options/', EmployeeOptionsAPIView.as_view(), name='employee-options'),
    path('personal-details/entry/', EmployeeDetailEntryAPIView.as_view(), name='employee-detail-entry'),
    path('personal-details/update/', EmployeeDetailUpdateAPIView.as_view(), name='employee-detail-update'),
    path('personal-details/history/', EmployeeDetailHistoryAPIView.as_view(), name='employee-detail-history'),
    path('time-sheet/time-entry/', TimeEntryCreateAPIView.as_view(), name='time-entry-create'),
    path('time-sheet/entries/', TimeEntryListAPIView.as_view(), name='time-entry-list'),
    path(
        'time-sheet/public-holidays/',
        PublicHolidayDateListAPIView.as_view(),
        name='public-holiday-date-list',
    ),
    path('time-sheet/annual-leave/', AnnualLeaveCreateAPIView.as_view(), name='annual-leave-create'),
    path('salary/advance/', SalaryAdvanceCreateAPIView.as_view(), name='salary-advance-create'),
    path('salary/payroll-preview/', PayrollPreviewAPIView.as_view(), name='payroll-preview'),
    path('salary/payroll/', PayrollGenerateAPIView.as_view(), name='payroll-generate'),
    path(
        'salary/actual-incurred-cost/',
        SalaryActualIncurredCostAPIView.as_view(),
        name='salary-actual-incurred-cost',
    ),
    path('associated-cost/entry/', AssociatedCostEntryAPIView.as_view(), name='associated-cost-entry'),
    path('associated-cost/', AssociatedCostEntryListAPIView.as_view(), name='associated-cost-list'),
    path('associated-cost/payment/entry/', AssociatedCostPaymentEntryAPIView.as_view(), name='associated-cost-payment-entry'),
    path('associated-cost/payment/', AssociatedCostPaymentListAPIView.as_view(), name='associated-cost-payment-list'),
]
