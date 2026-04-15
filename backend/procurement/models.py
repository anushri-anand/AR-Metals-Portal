from django.db import models


class Vendor(models.Model):
    supplier_name = models.CharField(max_length=255, unique=True)
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

    def __str__(self):
        return self.supplier_name


class PurchaseOrder(models.Model):
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

    cost_code = models.CharField(max_length=50, choices=COST_CODE_CHOICES)

    MODE_OF_PAYMENT_CHOICES = (
        ('Cheque', 'Cheque'),
        ('Cash', 'Cash'),
        ('Transfer', 'Transfer'),
        ('Card', 'Card'),
    )

    po_number = models.CharField(max_length=100, unique=True)
    project_number = models.CharField(max_length=100)
    project_name = models.CharField(max_length=255)

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
    currency = models.CharField(max_length=50)

    po_amount = models.DecimalField(max_digits=14, decimal_places=2)
    exchange_rate = models.DecimalField(max_digits=14, decimal_places=4)

    po_amount_aed = models.DecimalField(max_digits=14, decimal_places=2)
    vat_aed = models.DecimalField(max_digits=14, decimal_places=2)
    po_amount_inc_vat_aed = models.DecimalField(max_digits=14, decimal_places=2)

    mode_of_payment = models.CharField(max_length=20, choices=MODE_OF_PAYMENT_CHOICES)
    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-po_date_original', 'po_number']

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
    quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)

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
