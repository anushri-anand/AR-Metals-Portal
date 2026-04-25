from django.db import models

from procurement.models import PurchaseOrder
from shared.company import COMPANY_CHOICES, COMPANY_DEFAULT


class MasterListItem(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    item_description = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    po_ref = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.SET_NULL,
        related_name='estimation_master_items',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['item_description']

    def __str__(self):
        return self.item_description


class ClientData(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    client_name = models.CharField(max_length=255)
    supplier_trn_no = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    contact_person = models.CharField(max_length=255, blank=True, default='')
    mobile_number = models.CharField(max_length=50, blank=True, default='')
    company_tel_number = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['client_name']
        unique_together = ('company', 'client_name')

    def __str__(self):
        return self.client_name


class TenderLog(models.Model):
    TYPE_REMEASURABLE = 'Re-measurable'
    TYPE_LUMPSUM = 'Lumpsum'
    TYPE_COST_PLUS = 'Cost Plus'
    GEO_UAE = 'UAE'
    GEO_GCC = 'GCC'
    GEO_OTHERS = 'Others'

    STATUS_SUBMITTED_AWAITING = 'Submitted & Awaiting'
    STATUS_AWARDED_ARM = 'Awarded to ARM'
    STATUS_AWARDED_OTHERS = 'Awarded to Others'
    STATUS_CHANGED_TO_VO = 'Changed to VO'
    STATUS_CANCELLED = 'Cancelled'
    STATUS_REGRETTED = 'Regretted'
    STATUS_TO_REVISE = 'To Revise & Re-submit'
    STATUS_UNDER_PRICING = 'Under Pricing'

    STATUS_CHOICES = (
        (STATUS_SUBMITTED_AWAITING, STATUS_SUBMITTED_AWAITING),
        (STATUS_AWARDED_ARM, STATUS_AWARDED_ARM),
        (STATUS_AWARDED_OTHERS, STATUS_AWARDED_OTHERS),
        (STATUS_CHANGED_TO_VO, STATUS_CHANGED_TO_VO),
        (STATUS_CANCELLED, STATUS_CANCELLED),
        (STATUS_REGRETTED, STATUS_REGRETTED),
        (STATUS_TO_REVISE, STATUS_TO_REVISE),
        (STATUS_UNDER_PRICING, STATUS_UNDER_PRICING),
    )

    TYPE_OF_CONTRACT_CHOICES = (
        (TYPE_REMEASURABLE, TYPE_REMEASURABLE),
        (TYPE_LUMPSUM, TYPE_LUMPSUM),
        (TYPE_COST_PLUS, TYPE_COST_PLUS),
    )

    GEOGRAPHY_CHOICES = (
        (GEO_UAE, GEO_UAE),
        (GEO_GCC, GEO_GCC),
        (GEO_OTHERS, GEO_OTHERS),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    tender_number = models.CharField(max_length=100)
    quote_ref = models.CharField(max_length=100, blank=True, default='')
    revision_number = models.CharField(max_length=50, blank=True, default='')
    revision_date = models.DateField(null=True, blank=True)
    client = models.ForeignKey(
        ClientData,
        on_delete=models.SET_NULL,
        related_name='tenders',
        null=True,
        blank=True,
    )
    project_name = models.CharField(max_length=255, blank=True, default='')
    project_location = models.CharField(max_length=255, blank=True, default='')
    geography = models.CharField(
        max_length=20,
        choices=GEOGRAPHY_CHOICES,
        default=GEO_UAE,
    )
    type_of_contract = models.CharField(
        max_length=50,
        choices=TYPE_OF_CONTRACT_CHOICES,
        default=TYPE_REMEASURABLE,
    )
    description = models.TextField(blank=True, default='')
    selling_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tender_date = models.DateField(null=True, blank=True)
    submission_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=100,
        choices=STATUS_CHOICES,
        default=STATUS_UNDER_PRICING,
    )
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tender_number']
        unique_together = ('company', 'tender_number')

    def __str__(self):
        return self.tender_number


class BoqItem(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    sn = models.CharField(max_length=50, blank=True, default='')
    tender_number = models.CharField(max_length=100, db_index=True)
    revision_number = models.CharField(max_length=50, blank=True, default='')
    revision_date = models.DateField(null=True, blank=True)
    clients_boq = models.CharField(max_length=255, blank=True, default='')
    package = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    freight_custom_duty_percent = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )
    prelims_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    foh_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    commitments_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    contingencies_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    markup = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tender_number', 'revision_number', 'sn', 'id']

    def __str__(self):
        return f'{self.tender_number} - {self.sn or self.id}'


class TenderCosting(models.Model):
    boq_item = models.OneToOneField(
        BoqItem,
        on_delete=models.CASCADE,
        related_name='costing',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['boq_item__tender_number', 'boq_item__sn']

    def __str__(self):
        return f'Costing - {self.boq_item.tender_number}'


class CostingRevisionSnapshot(models.Model):
    STATUS_SUBMITTED = 'submitted'
    STATUS_APPROVED = 'approved'

    STATUS_CHOICES = (
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Approved'),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    tender_number = models.CharField(max_length=100, db_index=True)
    project_name = models.CharField(max_length=255, blank=True, default='')
    revision_number = models.CharField(max_length=50, blank=True, default='', db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SUBMITTED,
        db_index=True,
    )
    submitted_by = models.CharField(max_length=150, blank=True, default='')
    approved_by = models.CharField(max_length=150, blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tender_number', 'revision_number', '-submitted_at', '-id']
        unique_together = ('company', 'tender_number', 'revision_number')

    def __str__(self):
        return f'{self.tender_number} {self.revision_number or "Current"} - {self.status}'


class EstimateCostLine(models.Model):
    MATERIAL = 'material'
    MACHINING = 'machining'
    COATING = 'coating'
    CONSUMABLE = 'consumable'
    SUBCONTRACT = 'subcontract'

    CATEGORY_CHOICES = (
        (MATERIAL, 'Material'),
        (MACHINING, 'Machining'),
        (COATING, 'Coating'),
        (CONSUMABLE, 'Consumable'),
        (SUBCONTRACT, 'Subcontract'),
    )

    costing = models.ForeignKey(
        TenderCosting,
        on_delete=models.CASCADE,
        related_name='estimate_lines',
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    item = models.ForeignKey(
        MasterListItem,
        on_delete=models.SET_NULL,
        related_name='estimate_lines',
        null=True,
        blank=True,
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    wastage_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        ordering = ['costing', 'category','id']

    def __str__(self):
        return f'{self.costing} - {self.category}'


class LabourCostLine(models.Model):
    PRODUCTION_LABOUR = 'production_labour'
    INSTALLATION_LABOUR = 'installation_labour'

    CATEGORY_CHOICES = (
        (PRODUCTION_LABOUR, 'Production Labour'),
        (INSTALLATION_LABOUR, 'Installation Labour'),
    )

    STAGE_CHOICES = (
        ('Cutting', 'Cutting'),
        ('Grooving', 'Grooving'),
        ('Bending', 'Bending'),
        ('Fabrication', 'Fabrication'),
        ('Welding', 'Welding'),
        ('Finishing', 'Finishing'),
        ('Coating', 'Coating'),
        ('Assembly', 'Assembly'),
        ('Installation', 'Installation'),
        ('Packing', 'Packing'),
    )

    ROLE_CHOICES = (
        ('skilled', 'Skilled'),
        ('semiSkilled', 'Semiskilled'),
        ('helper', 'Helper'),
    )

    costing = models.ForeignKey(
        TenderCosting,
        on_delete=models.CASCADE,
        related_name='labour_lines',
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    item = models.ForeignKey(
        MasterListItem,
        on_delete=models.SET_NULL,
        related_name='labour_cost_lines',
        null=True,
        blank=True,
    )
    hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ['costing', 'category', 'stage', 'role']
        unique_together = ('costing', 'category', 'stage', 'role')

    def __str__(self):
        return f'{self.costing} - {self.category} - {self.stage} - {self.role}'


class ContractRevenue(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    project_number = models.CharField(max_length=100)
    project_name = models.CharField(max_length=255)
    contract_value = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    start_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    budget_material = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_machining = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_coating = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_consumables = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_subcontracts = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_production_labour = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    budget_freight_custom = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    budget_installation_labour = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    budget_prelims = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_foh = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_commitments = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    budget_contingencies = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_material = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_machining = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_coating = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_consumables = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_subcontracts = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_production_labour = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_freight_custom = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_installation_labour = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_prelims = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_foh = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_commitments = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    variation_budget_contingencies = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project_number', '-created_at']

    def __str__(self):
        return f'{self.project_number} - {self.project_name}'


class ContractRevenueVariation(models.Model):
    revenue = models.ForeignKey(
        ContractRevenue,
        on_delete=models.CASCADE,
        related_name='variations',
    )
    variation_number = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.revenue.project_number} - {self.variation_number}'


class ContractVariationLog(models.Model):
    STATUS_AGREED = 'Agreed'
    STATUS_SUBMITTED = 'Submitted'
    STATUS_TO_BE_SUBMITTED = 'To be Submitted'
    STATUS_REJECTED = 'Rejected'
    STATUS_DISPUTED = 'Disputed'
    STATUS_CANCELLED = 'Cancelled'

    STATUS_CHOICES = (
        (STATUS_AGREED, STATUS_AGREED),
        (STATUS_SUBMITTED, STATUS_SUBMITTED),
        (STATUS_TO_BE_SUBMITTED, STATUS_TO_BE_SUBMITTED),
        (STATUS_REJECTED, STATUS_REJECTED),
        (STATUS_DISPUTED, STATUS_DISPUTED),
        (STATUS_CANCELLED, STATUS_CANCELLED),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    project_number = models.CharField(max_length=100)
    project_name = models.CharField(max_length=255)
    rfv_number = models.CharField(max_length=100, blank=True, default='')
    client_variation_number = models.CharField(max_length=100, blank=True, default='')
    description = models.TextField(blank=True, default='')
    document_ref = models.CharField(max_length=100, blank=True, default='')
    submitted_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    arm_letter_ref = models.CharField(max_length=100, blank=True, default='')
    submitted_date = models.DateField(null=True, blank=True)
    approved_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    client_letter_ref = models.CharField(max_length=100, blank=True, default='')
    approved_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_TO_BE_SUBMITTED,
    )
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project_number', 'client_variation_number', 'id']

    def __str__(self):
        return f'{self.project_number} - {self.client_variation_number or self.id}'


class ContractPaymentLog(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    project_number = models.CharField(max_length=100)
    project_name = models.CharField(max_length=255)
    sn = models.PositiveIntegerField(default=1)
    submitted_date = models.DateField(null=True, blank=True)
    approved_date = models.DateField(null=True, blank=True)
    submitted_advance = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    submitted_recovery_advance = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    gross_submitted_amount = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    submitted_retention = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    submitted_release_retention = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    net_submitted_amount = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    submitted_vat = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    submitted_vat_amount = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    net_submitted_inc_vat = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    approved_advance = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    approved_recovery_advance = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    gross_approved_amount = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    approved_retention = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    approved_release_retention = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    net_approved_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    approved_vat = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    approved_vat_amount = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    net_approved_inc_vat = models.DecimalField(
        max_digits=16,
        decimal_places=2,
        default=0,
    )
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    forecast_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project_number', 'sn', 'id']

    def __str__(self):
        return f'{self.project_number} - Payment {self.sn}'
