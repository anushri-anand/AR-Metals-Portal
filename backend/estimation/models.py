from django.db import models

from procurement.models import PurchaseOrder


class MasterListItem(models.Model):
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
    client_name = models.CharField(max_length=255, unique=True)
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

    def __str__(self):
        return self.client_name


class TenderLog(models.Model):
    tender_number = models.CharField(max_length=100, unique=True)
    tender_name = models.CharField(max_length=255, blank=True, default='')
    client = models.ForeignKey(
        ClientData,
        on_delete=models.SET_NULL,
        related_name='tenders',
        null=True,
        blank=True,
    )
    project_name = models.CharField(max_length=255, blank=True, default='')
    tender_date = models.DateField(null=True, blank=True)
    submission_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=100, blank=True, default='')
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tender_number']

    def __str__(self):
        return self.tender_number


class BoqItem(models.Model):
    sn = models.CharField(max_length=50, blank=True, default='')
    tender_number = models.CharField(max_length=100, db_index=True)
    revision_number = models.CharField(max_length=50, blank=True, default='')
    clients_boq = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
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
    quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    wastage_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        ordering = ['costing', 'category']
        unique_together = ('costing', 'category')

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
