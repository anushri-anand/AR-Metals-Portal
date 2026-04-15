from django.contrib import admin

from .models import (
    BoqItem,
    ClientData,
    ContractPaymentLog,
    ContractRevenue,
    ContractRevenueVariation,
    ContractVariationLog,
    EstimateCostLine,
    LabourCostLine,
    MasterListItem,
    TenderLog,
    TenderCosting,
)


@admin.register(ClientData)
class ClientDataAdmin(admin.ModelAdmin):
    list_display = (
        'client_name',
        'supplier_trn_no',
        'contact_person',
        'email',
    )
    search_fields = ('client_name', 'supplier_trn_no', 'contact_person', 'email')


@admin.register(TenderLog)
class TenderLogAdmin(admin.ModelAdmin):
    list_display = (
        'tender_number',
        'quote_ref',
        'revision_number',
        'client',
        'project_name',
        'selling_amount',
        'status',
        'submission_date',
    )
    list_filter = ('status', 'submission_date')
    search_fields = (
        'tender_number',
        'quote_ref',
        'revision_number',
        'client__client_name',
        'project_name',
    )


admin.site.register(MasterListItem)
admin.site.register(BoqItem)
admin.site.register(TenderCosting)
admin.site.register(EstimateCostLine)
admin.site.register(LabourCostLine)
admin.site.register(ContractRevenue)
admin.site.register(ContractRevenueVariation)
admin.site.register(ContractVariationLog)
admin.site.register(ContractPaymentLog)
