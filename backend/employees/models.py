from django.db import models


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
