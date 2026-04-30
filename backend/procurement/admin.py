from django.contrib import admin

from .models import (
    AssetDeposit,
    BurReportSnapshot,
    DividendInvestmentEntry,
    GlPeriodClosing,
    InventoryIssuance,
    InventoryRelevantCostAllocation,
    PaymentDeliveryItem,
    PaymentEntry,
    PaymentPhase,
    PcrReportSnapshot,
    PettyCashVoucher,
    PettyCashVoucherItem,
    PurchaseOrder,
    Vendor,
    VendorContact,
)


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('supplier_name', 'company', 'vendor_id', 'trn_no', 'contact_person_name')
    list_filter = ('company',)
    search_fields = ('supplier_name', 'vendor_id', 'trn_no', 'contact_person_name', 'email')
    readonly_fields = ('created_at',)


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = (
        'po_number',
        'company',
        'order_type',
        'status',
        'project_number',
        'project_name',
        'supplier',
        'po_date_original',
    )
    list_filter = ('company', 'order_type', 'status', 'po_date_original')
    search_fields = ('po_number', 'project_number', 'project_name', 'supplier__supplier_name')
    readonly_fields = ('created_at', 'submitted_at', 'approved_at')


@admin.register(PaymentEntry)
class PaymentEntryAdmin(admin.ModelAdmin):
    list_display = (
        'purchase_order',
        'advance',
        'recovery_advance',
        'delivery',
        'retention',
        'release_retention',
    )
    search_fields = ('purchase_order__po_number', 'purchase_order__project_name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PettyCashVoucher)
class PettyCashVoucherAdmin(admin.ModelAdmin):
    list_display = ('voucher_number', 'company', 'created_at')
    list_filter = ('company', 'created_at')
    search_fields = ('voucher_number',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AssetDeposit)
class AssetDepositAdmin(admin.ModelAdmin):
    list_display = (
        'serial_number',
        'company',
        'client_name',
        'project_name',
        'amount',
        'mode_of_payment',
        'status',
        'expiry_date',
    )
    list_filter = ('company', 'status', 'mode_of_payment', 'expiry_date')
    search_fields = ('serial_number', 'client_name', 'project_name')
    readonly_fields = ('created_at', 'updated_at')


admin.site.register(VendorContact)
admin.site.register(PaymentDeliveryItem)
admin.site.register(PaymentPhase)
admin.site.register(InventoryIssuance)
admin.site.register(InventoryRelevantCostAllocation)
admin.site.register(PettyCashVoucherItem)
admin.site.register(DividendInvestmentEntry)
admin.site.register(GlPeriodClosing)
admin.site.register(PcrReportSnapshot)
admin.site.register(BurReportSnapshot)
