from rest_framework import serializers

from datetime import datetime
from decimal import Decimal

from .models import (
    AnnualLeave,
    Employee,
    EmployeeDetailHistory,
    SalaryAdvance,
    TimeEntry,
    SalaryAdvanceDeduction,

)

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_id',
            'employee_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeDetailHistorySerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = EmployeeDetailHistory
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'designation',
            'category',
            'visa_start_date',
            'visa_end_date',
            'passport_expiry_date',
            'visa_under',
            'basic_salary',
            'allowances',
            'salary_start_date',
            'salary_end_date',
            'employment_start_date',
            'employment_end_date',
            'is_current',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'is_current',
            'created_at',
        ]


class EmployeeEntrySerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    employee_name = serializers.CharField(max_length=255)
    designation = serializers.CharField(max_length=255)
    category = serializers.ChoiceField(choices=EmployeeDetailHistory.CATEGORY_CHOICES)

    visa_start_date = serializers.DateField(required=False, allow_null=True)
    visa_end_date = serializers.DateField(required=False, allow_null=True)
    passport_expiry_date = serializers.DateField(required=False, allow_null=True)
    visa_under = serializers.ChoiceField(choices=EmployeeDetailHistory.VISA_UNDER_CHOICES)

    basic_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    allowances = serializers.DecimalField(max_digits=12, decimal_places=2)

    salary_start_date = serializers.DateField()
    employment_start_date = serializers.DateField()

    def validate(self, attrs):
        employee_id = attrs.get('employee_id')
        employee_name = attrs.get('employee_name')

        if not employee_id:
            raise serializers.ValidationError({'employee_id': 'Employee ID is required.'})

        if not employee_name:
            raise serializers.ValidationError({'employee_name': 'Employee name is required.'})

        return attrs


class EmployeeUpdateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)

    designation = serializers.CharField(max_length=255)
    category = serializers.ChoiceField(choices=EmployeeDetailHistory.CATEGORY_CHOICES)

    visa_start_date = serializers.DateField(required=False, allow_null=True)
    visa_end_date = serializers.DateField(required=False, allow_null=True)
    passport_expiry_date = serializers.DateField(required=False, allow_null=True)

    basic_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    allowances = serializers.DecimalField(max_digits=12, decimal_places=2)

    salary_start_date = serializers.DateField(required=False, allow_null=True)
    employment_end_date = serializers.DateField(required=False, allow_null=True)

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value


class TimeEntrySerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'date',
            'day',
            'is_public_holiday',
            'start_time',
            'finish_time',
            'total_time',
            'regular_duty_hours',
            'normal_ot',
            'sunday_ot',
            'public_holiday_ot',
            'medical_leave_with_doc',
            'medical_leave_without_doc',
            'absent',
            'remarks',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'day',
            'total_time',
            'normal_ot',
            'sunday_ot',
            'public_holiday_ot',
            'created_at',
        ]


class TimeEntryCreateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    date = serializers.DateField()
    is_public_holiday = serializers.BooleanField(default=False)

    start_time = serializers.TimeField(required=False, allow_null=True)
    finish_time = serializers.TimeField(required=False, allow_null=True)

    regular_duty_hours = serializers.DecimalField(max_digits=6, decimal_places=2)

    medical_leave_with_doc = serializers.BooleanField(default=False)
    medical_leave_without_doc = serializers.BooleanField(default=False)
    absent = serializers.BooleanField(default=False)

    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def validate(self, attrs):
        medical_leave_with_doc = attrs.get('medical_leave_with_doc', False)
        medical_leave_without_doc = attrs.get('medical_leave_without_doc', False)
        absent = attrs.get('absent', False)

        special_status_count = sum([
            bool(medical_leave_with_doc),
            bool(medical_leave_without_doc),
            bool(absent),
        ])

        if special_status_count > 1:
            raise serializers.ValidationError(
                'Only one of medical leave with doc, medical leave without doc, or absent can be selected.'
            )

        is_leave_or_absent = medical_leave_with_doc or medical_leave_without_doc or absent

        start_time = attrs.get('start_time')
        finish_time = attrs.get('finish_time')

        if not is_leave_or_absent:
            if not start_time or not finish_time:
                raise serializers.ValidationError(
                    'Start time and finish time are required unless leave or absent is selected.'
                )

            if finish_time <= start_time:
                raise serializers.ValidationError(
                    'Finish time must be later than start time.'
                )

        return attrs


class AnnualLeaveSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = AnnualLeave
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'from_date',
            'to_date',
            'remarks',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'created_at',
        ]


class AnnualLeaveCreateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    from_date = serializers.DateField()
    to_date = serializers.DateField()
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def validate(self, attrs):
        if attrs['to_date'] < attrs['from_date']:
            raise serializers.ValidationError(
                {'to_date': 'To date must be greater than or equal to from date.'}
            )
        return attrs


class SalaryAdvanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = SalaryAdvance
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'advance_date',
            'amount',
            'remarks',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'created_at',
        ]


class SalaryAdvanceCreateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    advance_date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value


class PayrollPreviewRequestSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    
    advance_deduction = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default='0.00',
    )

    other_deduction = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default='0.00',
    )

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value


class AnnualLeaveSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = AnnualLeave
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'from_date',
            'to_date',
            'remarks',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'created_at',
        ]


class AnnualLeaveCreateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    from_date = serializers.DateField()
    to_date = serializers.DateField()
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def validate(self, attrs):
        if attrs['to_date'] < attrs['from_date']:
            raise serializers.ValidationError(
                {'to_date': 'To date must be greater than or equal to from date.'}
            )
        return attrs


class SalaryAdvanceSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = SalaryAdvance
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'advance_date',
            'amount',
            'remarks',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'created_at',
        ]


class SalaryAdvanceCreateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    advance_date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value


class PayrollPreviewRequestSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50)
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    other_deduction = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default='0.00',
    )

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value


class PayrollPreviewSerializer(serializers.Serializer):
    employee_id = serializers.CharField()
    employee_name = serializers.CharField()
    month = serializers.IntegerField()
    year = serializers.IntegerField()

    calendar_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    medical_leave_with_doc_days = serializers.IntegerField()
    medical_leave_without_doc_days = serializers.IntegerField()
    annual_leave_days = serializers.IntegerField()
    total_working_days = serializers.IntegerField()

    normal_ot_hours = serializers.DecimalField(max_digits=12, decimal_places=2)
    sunday_ot_hours = serializers.DecimalField(max_digits=12, decimal_places=2)
    public_holiday_ot_hours = serializers.DecimalField(max_digits=12, decimal_places=2)

    basic_salary_monthly = serializers.DecimalField(max_digits=12, decimal_places=2)
    basic_salary_earned = serializers.DecimalField(max_digits=12, decimal_places=2)

    other_allowances_monthly = serializers.DecimalField(max_digits=12, decimal_places=2)
    other_allowances_earned = serializers.DecimalField(max_digits=12, decimal_places=2)

    normal_ot_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    sunday_ot_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    public_holiday_ot_amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    advance_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    advance_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)
    other_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)

    total_earned = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)
