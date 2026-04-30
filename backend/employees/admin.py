from django.contrib import admin

from .models import (
    AnnualLeave,
    AssociatedCostEntry,
    AssociatedCostItem,
    AssociatedCostPayment,
    AssociatedCostPaymentItem,
    Employee,
    EmployeeDetailHistory,
    PayrollRecord,
    PublicHolidayDate,
    SalaryAdvance,
    SalaryAdvanceDeduction,
    TimeEntry,
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'employee_name', 'created_at', 'updated_at')
    search_fields = ('employee_id', 'employee_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(EmployeeDetailHistory)
class EmployeeDetailHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'designation',
        'category',
        'visa_under',
        'salary_start_date',
        'is_current',
    )
    list_filter = ('category', 'visa_under', 'is_current')
    search_fields = ('employee__employee_id', 'employee__employee_name', 'designation')
    readonly_fields = ('created_at',)


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = (
        'employee',
        'date',
        'day',
        'is_public_holiday',
        'total_time',
        'regular_duty_hours',
    )
    list_filter = ('date', 'day', 'is_public_holiday')
    search_fields = ('employee__employee_id', 'employee__employee_name', 'remarks')
    readonly_fields = ('created_at',)


@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'month', 'year', 'category', 'net_pay', 'created_at')
    list_filter = ('year', 'month', 'category')
    search_fields = ('employee__employee_id', 'employee__employee_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AssociatedCostEntry)
class AssociatedCostEntryAdmin(admin.ModelAdmin):
    list_display = ('serial_number', 'entry_type', 'supplier_name', 'date', 'cost_code')
    list_filter = ('entry_type', 'date', 'cost_code')
    search_fields = ('serial_number', 'supplier_name', 'cost_code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AssociatedCostPayment)
class AssociatedCostPaymentAdmin(admin.ModelAdmin):
    list_display = (
        'entry',
        'advance',
        'delivery',
        'retention',
        'release_retention',
    )
    search_fields = ('entry__serial_number', 'entry__supplier_name')
    readonly_fields = ('created_at', 'updated_at')


admin.site.register(PublicHolidayDate)
admin.site.register(AnnualLeave)
admin.site.register(SalaryAdvance)
admin.site.register(SalaryAdvanceDeduction)
admin.site.register(AssociatedCostItem)
admin.site.register(AssociatedCostPaymentItem)
