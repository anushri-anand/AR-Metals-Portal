from django.db import models

from shared.company import COMPANY_CHOICES, COMPANY_DEFAULT


class Vendor(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    supplier_name = models.CharField(max_length=255)
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    contact_person_name = models.CharField(max_length=255)
    mobile_number = models.CharField(max_length=50, blank=True, default='')
    company_telephone = models.CharField(max_length=50, blank=True, default='')
    product_details = models.TextField(blank=True, default='')
    review = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['supplier_name']
        unique_together = ('company', 'supplier_name')

    def __str__(self):
        return self.supplier_name


class PurchaseOrder(models.Model):
    ORDER_TYPE_PROJECT = 'project'
    ORDER_TYPE_ASSET = 'asset'
    ORDER_TYPE_INVENTORY = 'inventory'

    ORDER_TYPE_CHOICES = (
        (ORDER_TYPE_PROJECT, 'Project'),
        (ORDER_TYPE_ASSET, 'Asset'),
        (ORDER_TYPE_INVENTORY, 'Inventory'),
    )

    STATUS_DRAFT = 'draft'
    STATUS_SUBMITTED = 'submitted'
    STATUS_APPROVED = 'approved'

    STATUS_CHOICES = (
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Approved'),
    )

    COST_CODE_CHOICES = (
        ('Material', 'Material'),
        ('Machining', 'Machining'),
        ('Coating', 'Coating'),
        ('Consumables', 'Consumables'),
        ('Subcontracts', 'Subcontracts'),
        ('Labour', 'Labour'),
        ('Freight&Customs', 'Freight&Customs'),
        ('Prelims', 'Prelims'),
        ('FOH', 'FOH'),
        ('Commitments', 'Commitments'),
        ('Contingency', 'Contingency'),
    )

    MODE_OF_PAYMENT_CHOICES = (
        ('Cheque', 'Cheque'),
        ('Cash', 'Cash'),
        ('Transfer', 'Transfer'),
        ('Card', 'Card'),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        default=ORDER_TYPE_PROJECT,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
    )
    po_number = models.CharField(max_length=100)
    project_number = models.CharField(max_length=100, blank=True, default='')
    project_name = models.CharField(max_length=255, blank=True, default='')

    cost_code = models.CharField(max_length=50, choices=COST_CODE_CHOICES)

    po_date_original = models.DateField()
    po_date_revised = models.DateField(null=True, blank=True)
    po_rev_number = models.CharField(max_length=100, blank=True, default='')

    supplier = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        related_name='purchase_orders',
    )

    item_description = models.TextField()
    line_items = models.JSONField(default=list, blank=True)
    currency = models.CharField(max_length=50)

    po_amount = models.DecimalField(max_digits=14, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=14, decimal_places=4)

    po_amount_aed = models.DecimalField(max_digits=14, decimal_places=2)
    vat_aed = models.DecimalField(max_digits=14, decimal_places=2)
    po_amount_inc_vat_aed = models.DecimalField(max_digits=14, decimal_places=2)

    mode_of_payment = models.CharField(max_length=20, choices=MODE_OF_PAYMENT_CHOICES)
    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-po_date_original', 'po_number']
        unique_together = ('company', 'po_number')

    def __str__(self):
        return self.po_number


class PaymentEntry(models.Model):
    purchase_order = models.OneToOneField(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='payment_entry',
    )

    advance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    recovery_advance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    delivery = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    retention = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    release_retention = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['purchase_order__po_number']

    def __str__(self):
        return f'Payment - {self.purchase_order.po_number}'

    @property
    def net_payable_amount(self):
        return (
            self.advance
            - self.recovery_advance
            + self.delivery
            - self.retention
            + self.release_retention
        )


class PaymentDeliveryItem(models.Model):
    payment_entry = models.ForeignKey(
        PaymentEntry,
        on_delete=models.CASCADE,
        related_name='delivery_items',
    )

    line_number = models.PositiveIntegerField()
    item_description = models.TextField(blank=True, default='')
    quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['payment_entry', 'line_number']
        unique_together = ('payment_entry', 'line_number')

    def __str__(self):
        return f'{self.payment_entry.purchase_order.po_number} - Item {self.line_number}'

    @property
    def actual_incurred_cost(self):
        return self.received_quantity * self.rate


class PaymentPhase(models.Model):
    payment_entry = models.ForeignKey(
        PaymentEntry,
        on_delete=models.CASCADE,
        related_name='phases',
    )

    phase_number = models.PositiveIntegerField()

    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    due_date = models.DateField()
    forecast_date = models.DateField()
    paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    invoice_no = models.CharField(max_length=100, blank=True, default='')
    invoice_date = models.DateField(null=True, blank=True)
    gl_no = models.CharField(max_length=100, blank=True, default='')
    gl_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['payment_entry', 'phase_number']
        unique_together = ('payment_entry', 'phase_number')

    def save(self, *args, **kwargs):
        if not self.forecast_date:
            self.forecast_date = self.due_date
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.payment_entry.purchase_order.po_number} - Phase {self.phase_number}'

    @property
    def paid_exc_vat(self):
        return self.paid - self.vat


class InventoryIssuance(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='inventory_issuances',
    )
    line_number = models.PositiveIntegerField()
    issuance_date = models.DateField(db_index=True)
    project_name = models.CharField(max_length=255)
    project_number = models.CharField(max_length=100)
    quantity_issued = models.DecimalField(max_digits=14, decimal_places=6, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['issuance_date', 'id']

    def __str__(self):
        return f'{self.purchase_order.po_number} - Item {self.line_number}'


class InventoryRelevantCostAllocation(models.Model):
    inventory_purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='relevant_cost_allocations',
    )
    inventory_line_number = models.PositiveIntegerField()
    relevant_purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='inventory_relevant_cost_allocations',
    )
    relevant_line_number = models.PositiveIntegerField()
    relevant_cost_percentage = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            'relevant_purchase_order__po_number',
            'inventory_purchase_order__po_number',
            'inventory_line_number',
            'relevant_line_number',
        ]
        unique_together = (
            'inventory_purchase_order',
            'inventory_line_number',
            'relevant_purchase_order',
            'relevant_line_number',
        )

    def __str__(self):
        return (
            f'{self.relevant_purchase_order.po_number} <- '
            f'{self.inventory_purchase_order.po_number} item {self.inventory_line_number} '
            f'-> line {self.relevant_line_number}'
        )


class PettyCashVoucher(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    voucher_number = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', 'voucher_number']
        unique_together = ('company', 'voucher_number')

    def __str__(self):
        return self.voucher_number


class PettyCashVoucherItem(models.Model):
    voucher = models.ForeignKey(
        PettyCashVoucher,
        on_delete=models.CASCADE,
        related_name='items',
    )
    line_number = models.PositiveIntegerField()
    item = models.CharField(max_length=255)
    account_code = models.CharField(max_length=100, blank=True, default='')
    project_name = models.CharField(max_length=255)
    project_number = models.CharField(max_length=100)
    cost_code = models.CharField(
        max_length=50,
        choices=PurchaseOrder.COST_CODE_CHOICES,
    )
    quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_exc_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    due_amount_inc_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount_inc_vat = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField(null=True, blank=True)
    supplier_name = models.CharField(max_length=255)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    forecast_date = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['voucher', 'line_number']
        unique_together = ('voucher', 'line_number')

    def __str__(self):
        return f'{self.voucher.voucher_number} - Item {self.line_number}'


class AssetDeposit(models.Model):
    MODE_PDC = 'PDC'
    MODE_CDC = 'CDC'
    MODE_CASH = 'Cash'
    MODE_TRANSFER = 'Transfer'

    MODE_OF_PAYMENT_CHOICES = (
        (MODE_PDC, 'PDC'),
        (MODE_CDC, 'CDC'),
        (MODE_CASH, 'Cash'),
        (MODE_TRANSFER, 'Transfer'),
    )

    STATUS_SUBMITTED = 'Submitted'
    STATUS_RETURNED = 'Returned'

    STATUS_CHOICES = (
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_RETURNED, 'Returned'),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    serial_number = models.CharField(max_length=100)
    client_name = models.CharField(max_length=255)
    project_name = models.CharField(max_length=255, blank=True, default='')
    project_name_not_available = models.BooleanField(default=False)
    currency = models.CharField(max_length=50, default='AED')
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    mode_of_payment = models.CharField(max_length=20, choices=MODE_OF_PAYMENT_CHOICES)
    expiry_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUBMITTED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-expiry_date', 'serial_number']
        unique_together = ('company', 'serial_number')

    def __str__(self):
        return self.serial_number


class DividendInvestmentEntry(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    date = models.DateField(db_index=True)
    client = models.CharField(max_length=255)
    paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'id']

    def __str__(self):
        return f'{self.client} - {self.date}'


class GlPeriodClosing(models.Model):
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
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
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
        ordering = ['-year', '-month', '-id']
        unique_together = ('company', 'month', 'year')

    def __str__(self):
        return f'{self.company} {self.month:02d}/{self.year} - {self.status}'


class PcrReportSnapshot(models.Model):
    STATUS_SUBMITTED = 'submitted'
    STATUS_APPROVED = 'approved'

    STATUS_CHOICES = (
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Approved'),
    )

    QUARTER_CHOICES = (
        ('Q1', 'Q1'),
        ('Q2', 'Q2'),
        ('Q3', 'Q3'),
        ('Q4', 'Q4'),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    project_number = models.CharField(max_length=100, db_index=True)
    project_name = models.CharField(max_length=255)
    quarter = models.CharField(max_length=2, choices=QUARTER_CHOICES, db_index=True)
    year = models.PositiveIntegerField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SUBMITTED,
        db_index=True,
    )
    report_data = models.JSONField(default=dict, blank=True)
    submitted_by = models.CharField(max_length=150, blank=True, default='')
    approved_by = models.CharField(max_length=150, blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-quarter', 'project_number', '-id']
        unique_together = ('company', 'project_number', 'quarter', 'year')

    def __str__(self):
        return (
            f'{self.project_number} {self.quarter} {self.year} - {self.status}'
        )


class BurReportSnapshot(models.Model):
    STATUS_SUBMITTED = 'submitted'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = (
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    )

    QUARTER_CHOICES = (
        ('Q1', 'Q1'),
        ('Q2', 'Q2'),
        ('Q3', 'Q3'),
        ('Q4', 'Q4'),
    )

    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    quarter = models.CharField(max_length=2, choices=QUARTER_CHOICES, db_index=True)
    year = models.PositiveIntegerField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SUBMITTED,
        db_index=True,
    )
    report_data = models.JSONField(default=dict, blank=True)
    submitted_by = models.CharField(max_length=150, blank=True, default='')
    reviewed_by = models.CharField(max_length=150, blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-quarter', '-id']
        unique_together = ('company', 'quarter', 'year')

    def __str__(self):
        return f'BUR {self.quarter} {self.year} - {self.status}'
