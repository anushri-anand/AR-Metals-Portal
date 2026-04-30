from django.contrib import admin

from .models import (
    DeliveryEntry,
    ProjectDetail,
    ProjectItem,
    ProjectVariation,
    ProjectVariationItem,
    TimeAllocationEntry,
    TimeAllocationLine,
    WorkCompletionEntry,
)


@admin.register(TimeAllocationEntry)
class TimeAllocationEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'company', 'employee_id', 'employee_name', 'cost_code', 'account_code')
    list_filter = ('company', 'date', 'cost_code')
    search_fields = ('employee_id', 'employee_name', 'cost_code', 'account_code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(WorkCompletionEntry)
class WorkCompletionEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'variation_number', 'package', 'item_name', 'total_quantity', 'unit')
    list_filter = ('date', 'variation_number', 'package')
    search_fields = ('item_name', 'package', 'boq_sn')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DeliveryEntry)
class DeliveryEntryAdmin(admin.ModelAdmin):
    list_display = (
        'date',
        'variation_number',
        'package',
        'item_name',
        'delivery_note_number',
        'quantity',
    )
    list_filter = ('date', 'variation_number', 'package')
    search_fields = ('item_name', 'package', 'boq_sn', 'delivery_note_number')
    readonly_fields = ('created_at', 'updated_at')


admin.site.register(ProjectDetail)
admin.site.register(ProjectItem)
admin.site.register(ProjectVariation)
admin.site.register(ProjectVariationItem)
admin.site.register(TimeAllocationLine)
