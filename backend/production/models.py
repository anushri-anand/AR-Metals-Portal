from django.db import models

from shared.company import COMPANY_CHOICES, COMPANY_DEFAULT


class ProjectDetail(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    tender_number = models.CharField(max_length=100, blank=True, default='')
    revision_number = models.CharField(max_length=50, blank=True, default='')
    project_name = models.CharField(max_length=255)
    project_number = models.CharField(max_length=100)
    contract_po_ref = models.CharField(max_length=255, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project_number']
        unique_together = ('company', 'project_number')

    def __str__(self):
        return f'{self.project_number} - {self.project_name}'


class ProjectItem(models.Model):
    project = models.ForeignKey(
        ProjectDetail,
        on_delete=models.CASCADE,
        related_name='items',
    )

    boq_sn = models.CharField(max_length=50, blank=True, default='')
    package = models.CharField(max_length=255, blank=True, default='')
    item_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=6)
    unit = models.CharField(max_length=50)
    estimated_mh = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.project.project_number} - {self.item_name}'


class ProjectVariation(models.Model):
    project = models.ForeignKey(
        ProjectDetail,
        on_delete=models.CASCADE,
        related_name='variations',
    )
    variation_number = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project', 'variation_number', 'id']
        unique_together = ('project', 'variation_number')

    def __str__(self):
        return f'{self.project.project_number} - {self.variation_number}'


class ProjectVariationItem(models.Model):
    variation = models.ForeignKey(
        ProjectVariation,
        on_delete=models.CASCADE,
        related_name='items',
    )
    item_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=6)
    unit = models.CharField(max_length=50)
    estimated_mh = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['variation', 'id']

    def __str__(self):
        return f'{self.variation.variation_number} - {self.item_name}'


class TimeAllocationEntry(models.Model):
    company = models.CharField(
        max_length=10,
        choices=COMPANY_CHOICES,
        default=COMPANY_DEFAULT,
        db_index=True,
    )
    date = models.DateField(db_index=True)
    employee_id = models.CharField(max_length=100, db_index=True)
    employee_name = models.CharField(max_length=255, db_index=True)
    cost_code = models.CharField(max_length=100, blank=True, default='')
    account_code = models.CharField(max_length=100, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'employee_id', '-created_at']

    def __str__(self):
        return (
            f'{self.date} - {self.employee_id} - {self.employee_name} - '
            f'{self.cost_code or "-"}'
        )


class TimeAllocationLine(models.Model):
    entry = models.ForeignKey(
        TimeAllocationEntry,
        on_delete=models.CASCADE,
        related_name='lines',
    )
    project_number = models.CharField(max_length=100, blank=True, default='', db_index=True)
    project_name = models.CharField(max_length=255, blank=True, default='', db_index=True)
    variation_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
    )
    package = models.CharField(max_length=255, blank=True, default='', db_index=True)
    boq_sn = models.CharField(max_length=50, blank=True, default='', db_index=True)
    item_name = models.CharField(max_length=255, blank=True, default='', db_index=True)
    percentage = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            'entry',
            'project_number',
            'variation_number',
            'package',
            'boq_sn',
            'item_name',
            'id',
        ]

    def __str__(self):
        return (
            f'{self.entry.employee_id} - {self.project_number} - '
            f'{self.variation_number or "Base"} - '
            f'{self.package or self.boq_sn or "No Ref"} - {self.item_name or "No Item"}'
        )


class WorkCompletionEntry(models.Model):
    project = models.ForeignKey(
        ProjectDetail,
        on_delete=models.CASCADE,
        related_name='work_completion_entries',
    )
    variation_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
    )
    date = models.DateField(db_index=True)
    package = models.CharField(max_length=255, blank=True, default='', db_index=True)
    boq_sn = models.CharField(max_length=50, blank=True, default='', db_index=True)
    item_name = models.CharField(max_length=255, db_index=True)
    total_quantity = models.DecimalField(max_digits=12, decimal_places=6)
    unit = models.CharField(max_length=50)
    cutting = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    grooving = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    bending = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    fabrication = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    welding = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    finishing = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    coating = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    assembly = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    installation = models.DecimalField(max_digits=12, decimal_places=6, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            '-date',
            'project__project_number',
            'variation_number',
            'package',
            'item_name',
            'id',
        ]
        db_table = 'production_status_work_completion_entry'

    def __str__(self):
        return (
            f'{self.project.project_number} - {self.variation_number or "Base"} - '
            f'{self.package or self.item_name} - {self.date}'
        )


class DeliveryEntry(models.Model):
    project = models.ForeignKey(
        ProjectDetail,
        on_delete=models.CASCADE,
        related_name='delivery_entries',
    )
    variation_number = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
    )
    date = models.DateField(db_index=True)
    package = models.CharField(max_length=255, blank=True, default='', db_index=True)
    boq_sn = models.CharField(max_length=50, blank=True, default='', db_index=True)
    item_name = models.CharField(max_length=255, db_index=True)
    total_quantity = models.DecimalField(max_digits=12, decimal_places=6)
    unit = models.CharField(max_length=50)
    delivery_note_number = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=12, decimal_places=6, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            '-date',
            'project__project_number',
            'variation_number',
            'package',
            'item_name',
            'id',
        ]
        db_table = 'production_status_delivery_entry'

    def __str__(self):
        return (
            f'{self.project.project_number} - {self.variation_number or "Base"} - '
            f'{self.package or self.item_name} - {self.delivery_note_number}'
        )
