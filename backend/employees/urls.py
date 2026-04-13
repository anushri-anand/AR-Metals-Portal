from django.urls import path

from .views import (
    AnnualLeaveCreateAPIView,
    EmployeeDetailEntryAPIView,
    EmployeeDetailHistoryAPIView,
    EmployeeDetailUpdateAPIView,
    EmployeeOptionsAPIView,
    PayrollPreviewAPIView,
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
    path('time-sheet/annual-leave/', AnnualLeaveCreateAPIView.as_view(), name='annual-leave-create'),
    path('salary/advance/', SalaryAdvanceCreateAPIView.as_view(), name='salary-advance-create'),
    path('salary/payroll-preview/', PayrollPreviewAPIView.as_view(), name='payroll-preview'),
]
