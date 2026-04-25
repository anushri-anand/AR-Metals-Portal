from django.db import models

ASSOCIATED_COST_CODE_CHOICES = (
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


class Employee(models.Model):
    employee_id = models.CharField(max_length=50, unique=True)
    employee_name = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee_id']

    def __str__(self):
        return f'{self.employee_id} - {self.employee_name}'


class EmployeeDetailHistory(models.Model):
    CATEGORY_CHOICES = (
        ('Staff', 'Staff'),
        ('Labour', 'Labour'),
    )

    VISA_UNDER_CHOICES = (
        ('AKR', 'AKR'),
        ('ARM', 'ARM'),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='detail_history',
    )

    designation = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    visa_start_date = models.DateField(null=True, blank=True)
    visa_end_date = models.DateField(null=True, blank=True)
    passport_expiry_date = models.DateField(null=True, blank=True)
    visa_under = models.CharField(max_length=10, choices=VISA_UNDER_CHOICES)

    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2)

    salary_start_date = models.DateField()
    salary_end_date = models.DateField(null=True, blank=True)

    employment_start_date = models.DateField()
    employment_end_date = models.DateField(null=True, blank=True)

    is_current = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['employee__employee_id', '-salary_start_date', '-created_at']

    def __str__(self):
        return (
            f'{self.employee.employee_id} - {self.employee.employee_name} - '
            f'{self.salary_start_date}'
        )


class TimeEntry(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='time_entries',
    )

    date = models.DateField()
    day = models.CharField(max_length=20)

    is_public_holiday = models.BooleanField(default=False)

    start_time = models.TimeField(null=True, blank=True)
    finish_time = models.TimeField(null=True, blank=True)

    total_time = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    regular_duty_hours = models.DecimalField(max_digits=6, decimal_places=2, default=9)

    normal_ot = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    sunday_ot = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    public_holiday_ot = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    medical_leave_with_doc = models.BooleanField(default=False)
    medical_leave_without_doc = models.BooleanField(default=False)
    absent = models.BooleanField(default=False)

    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'employee__employee_id']

    def __str__(self):
        return f'{self.employee.employee_id} - {self.date}'


class AnnualLeave(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='annual_leaves',
    )

    from_date = models.DateField()
    to_date = models.DateField()

    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-from_date', 'employee__employee_id']

    def __str__(self):
        return f'{self.employee.employee_id} - Annual Leave - {self.from_date} to {self.to_date}'


class SalaryAdvance(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='salary_advances',
    )

    advance_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-advance_date', 'employee__employee_id']

    def __str__(self):
        return f'{self.employee.employee_id} - Advance - {self.advance_date}'

class SalaryAdvanceDeduction(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='salary_advance_deductions',
    )

    deduction_month = models.PositiveSmallIntegerField()
    deduction_year = models.PositiveIntegerField()
    deduction_date = models.DateField()

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-deduction_date', 'employee__employee_id']
        unique_together = ('employee', 'deduction_month', 'deduction_year')

    def __str__(self):
        return (
            f'{self.employee.employee_id} - Advance Deduction - '
            f'{self.deduction_month}/{self.deduction_year}'
        )


class PayrollRecord(models.Model):
    CATEGORY_CHOICES = EmployeeDetailHistory.CATEGORY_CHOICES

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='payroll_records',
    )
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    payroll_date = models.DateField(db_index=True)

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    calendar_days = models.PositiveIntegerField(default=0)
    absent_days = models.PositiveIntegerField(default=0)
    medical_leave_with_doc_days = models.PositiveIntegerField(default=0)
    medical_leave_without_doc_days = models.PositiveIntegerField(default=0)
    annual_leave_days = models.PositiveIntegerField(default=0)
    total_working_days = models.PositiveIntegerField(default=0)

    normal_ot_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sunday_ot_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    public_holiday_ot_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    basic_salary_monthly = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    basic_salary_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowances_monthly = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_allowances_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    normal_ot_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sunday_ot_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    public_holiday_ot_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_ot_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    leave_salary_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gratuity_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    incentive = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    advance_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    advance_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['payroll_date', 'employee__employee_id']
        unique_together = ('employee', 'month', 'year')

    def __str__(self):
        return f'{self.employee.employee_id} - Payroll - {self.month}/{self.year}'


class AssociatedCostEntry(models.Model):
    TYPE_LABOUR = 'Labour'
    TYPE_OTHERS = 'Others'

    TYPE_CHOICES = (
        (TYPE_LABOUR, TYPE_LABOUR),
        (TYPE_OTHERS, TYPE_OTHERS),
    )

    serial_number = models.CharField(max_length=100, unique=True)
    entry_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_LABOUR,
        db_index=True,
    )
    supplier_name = models.CharField(max_length=255)
    date = models.DateField(db_index=True)
    cost_code = models.CharField(
        max_length=50,
        choices=ASSOCIATED_COST_CODE_CHOICES,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'serial_number']

    def __str__(self):
        return self.serial_number


class AssociatedCostItem(models.Model):
    entry = models.ForeignKey(
        AssociatedCostEntry,
        on_delete=models.CASCADE,
        related_name='items',
    )
    line_number = models.PositiveIntegerField()
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='associated_cost_items',
        null=True,
        blank=True,
    )
    account_code = models.CharField(max_length=100, blank=True, default='')
    cost_code = models.CharField(
        max_length=50,
        choices=ASSOCIATED_COST_CODE_CHOICES,
        default='FOH',
    )
    item_description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_percent = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['entry', 'line_number']
        unique_together = ('entry', 'line_number')

    def __str__(self):
        return f'{self.entry.serial_number} - Item {self.line_number}'


class AssociatedCostPayment(models.Model):
    entry = models.OneToOneField(
        AssociatedCostEntry,
        on_delete=models.CASCADE,
        related_name='payment',
    )
    advance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    recovery_advance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    delivery = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    retention = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    release_retention = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['entry__serial_number']

    def __str__(self):
        return f'Associated Cost Payment - {self.entry.serial_number}'

    @property
    def net_payable_amount(self):
        return (
            self.advance
            - self.recovery_advance
            + self.delivery
            - self.retention
            + self.release_retention
        )


class AssociatedCostPaymentItem(models.Model):
    payment = models.ForeignKey(
        AssociatedCostPayment,
        on_delete=models.CASCADE,
        related_name='delivery_items',
    )
    line_number = models.PositiveIntegerField()
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='associated_cost_payment_items',
        null=True,
        blank=True,
    )
    account_code = models.CharField(max_length=100, blank=True, default='')
    cost_code = models.CharField(
        max_length=50,
        choices=ASSOCIATED_COST_CODE_CHOICES,
        default='FOH',
    )
    item_description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    unit = models.CharField(max_length=50, blank=True, default='')
    rate = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    received_quantity = models.DecimalField(max_digits=14, decimal_places=6, default=0)
    invoice_number = models.CharField(max_length=100, blank=True, default='')
    invoice_date = models.DateField(null=True, blank=True)
    gl_no = models.CharField(max_length=100, blank=True, default='')
    gl_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['payment', 'line_number']
        unique_together = ('payment', 'line_number')

    def __str__(self):
        return f'{self.payment.entry.serial_number} - Delivery Item {self.line_number}'

    @property
    def actual_incurred_cost(self):
        return self.received_quantity * self.rate
