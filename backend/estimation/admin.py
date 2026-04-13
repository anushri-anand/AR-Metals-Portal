from django.contrib import admin

from .models import (
    BoqItem,
    ClientData,
    EstimateCostLine,
    LabourCostLine,
    MasterListItem,
    TenderLog,
    TenderCosting,
)


admin.site.register(ClientData)


@admin.register(TenderLog)
class TenderLogAdmin(admin.ModelAdmin):
    list_display = (
        'tender_number',
        'quote_ref',
        'client',
        'project_name',
        'status',
        'submission_date',
    )
    list_filter = ('status', 'submission_date')
    search_fields = (
        'tender_number',
        'quote_ref',
        'client__client_name',
        'project_name',
    )


admin.site.register(MasterListItem)
admin.site.register(BoqItem)
admin.site.register(TenderCosting)
admin.site.register(EstimateCostLine)
admin.site.register(LabourCostLine)
