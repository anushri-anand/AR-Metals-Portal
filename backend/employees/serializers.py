from rest_framework import serializers

from datetime import datetime
from decimal import Decimal
from shared.account_codes import normalize_account_code_for_cost_code

from .models import (
    ASSOCIATED_COST_CODE_CHOICES,
    AnnualLeave,
    AssociatedCostEntry,
    AssociatedCostItem,
    AssociatedCostPayment,
    AssociatedCostPaymentItem,
    Employee,
    EmployeeDetailHistory,
    PayrollRecord,
    SalaryAdvance,
    SalaryAdvanceDeduction,
    TimeEntry,
)

class EmployeeSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id',
            'employee_id',
            'employee_name',
            'category',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_category(self, obj):
        detail_rows = list(obj.detail_history.all())
        current_rows = [row for row in detail_rows if row.is_current]
        current_rows.sort(
            key=lambda row: (row.salary_start_date, row.created_at),
            reverse=True,
        )
        current_detail = current_rows[0] if current_rows else None
        if current_detail:
            return current_detail.category

        detail_rows.sort(
            key=lambda row: (row.salary_start_date, row.created_at),
            reverse=True,
        )
        latest_detail = detail_rows[0] if detail_rows else None
        return latest_detail.category if latest_detail else ''


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


class AssociatedCostItemSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = AssociatedCostItem
        fields = [
            'id',
            'line_number',
            'employee',
            'employee_id',
            'employee_name',
            'account_code',
            'cost_code',
            'item_description',
            'quantity',
            'unit',
            'rate',
            'vat_percent',
            'amount',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'created_at',
            'updated_at',
        ]


class AssociatedCostEntrySerializer(serializers.ModelSerializer):
    items = AssociatedCostItemSerializer(many=True, read_only=True)

    class Meta:
        model = AssociatedCostEntry
        fields = [
            'id',
            'serial_number',
            'entry_type',
            'supplier_name',
            'date',
            'cost_code',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class AssociatedCostEntryItemCreateSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    account_code = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default='',
    )
    cost_code = serializers.ChoiceField(
        choices=ASSOCIATED_COST_CODE_CHOICES,
        required=False,
        default='FOH',
    )
    item_description = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=14, decimal_places=6)
    unit = serializers.CharField(max_length=50, required=False, allow_blank=True)
    rate = serializers.DecimalField(max_digits=14, decimal_places=2)
    vat_percent = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
    )
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate_employee_id(self, value):
        if not value:
            return value
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value

    def validate(self, attrs):
        if attrs['end_date'] < attrs['start_date']:
            raise serializers.ValidationError(
                {'end_date': 'End date must be greater than or equal to start date.'}
            )

        if attrs['quantity'] <= 0:
            raise serializers.ValidationError(
                {'quantity': 'Qty must be greater than 0.'}
            )

        if attrs['rate'] < 0:
            raise serializers.ValidationError(
                {'rate': 'Rate cannot be negative.'}
            )

        attrs['amount'] = (attrs['quantity'] * attrs['rate']).quantize(Decimal('0.01'))
        return attrs


class AssociatedCostEntryCreateSerializer(serializers.Serializer):
    entry_type = serializers.ChoiceField(
        choices=AssociatedCostEntry.TYPE_CHOICES,
        required=False,
        default=AssociatedCostEntry.TYPE_LABOUR,
    )
    supplier_name = serializers.CharField(max_length=255)
    date = serializers.DateField()
    items = AssociatedCostEntryItemCreateSerializer(many=True)

    def validate(self, attrs):
        items = attrs.get('items', [])
        if not items:
            raise serializers.ValidationError(
                {'items': 'At least one item is required.'}
            )

        entry_type = attrs.get('entry_type', AssociatedCostEntry.TYPE_LABOUR)

        for item in items:
            employee_id = (item.get('employee_id') or '').strip()

            if entry_type == AssociatedCostEntry.TYPE_LABOUR:
                if not employee_id:
                    raise serializers.ValidationError(
                        {'items': 'Employee ID is required for labour associated cost.'}
                    )

                employee = Employee.objects.filter(employee_id=employee_id).first()
                if not employee:
                    raise serializers.ValidationError(
                        {'items': f'Employee not found for {employee_id}.'}
                    )

                current_detail = (
                    employee.detail_history.filter(is_current=True)
                    .order_by('-salary_start_date', '-created_at')
                    .first()
                )
                latest_detail = (
                    employee.detail_history.order_by('-salary_start_date', '-created_at')
                    .first()
                )
                employee_category = (
                    current_detail.category
                    if current_detail
                    else latest_detail.category if latest_detail else ''
                )
                item['cost_code'] = item.get('cost_code') or (
                    'Labour' if employee_category == 'Labour' else 'FOH'
                )
            else:
                item['employee_id'] = ''
                item['cost_code'] = item.get('cost_code') or 'FOH'

            try:
                item['account_code'] = normalize_account_code_for_cost_code(
                    item.get('cost_code'),
                    item.get('account_code'),
                )
            except ValueError as exc:
                raise serializers.ValidationError({'items': str(exc)})

        attrs['cost_code'] = items[0].get('cost_code', 'FOH')
        return attrs


class AssociatedCostPaymentItemSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)
    actual_incurred_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = AssociatedCostPaymentItem
        fields = [
            'id',
            'line_number',
            'employee',
            'employee_id',
            'employee_name',
            'account_code',
            'cost_code',
            'item_description',
            'quantity',
            'unit',
            'rate',
            'received_quantity',
            'invoice_number',
            'invoice_date',
            'gl_no',
            'gl_date',
            'actual_incurred_cost',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'employee_id',
            'employee_name',
            'actual_incurred_cost',
            'created_at',
            'updated_at',
        ]


class AssociatedCostPaymentSerializer(serializers.ModelSerializer):
    serial_number = serializers.CharField(source='entry.serial_number', read_only=True)
    entry_type = serializers.CharField(source='entry.entry_type', read_only=True)
    supplier_name = serializers.CharField(source='entry.supplier_name', read_only=True)
    entry_date = serializers.DateField(source='entry.date', read_only=True)
    cost_code = serializers.CharField(source='entry.cost_code', read_only=True)
    delivery_items = AssociatedCostPaymentItemSerializer(many=True, read_only=True)
    net_payable_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = AssociatedCostPayment
        fields = [
            'id',
            'entry',
            'serial_number',
            'entry_type',
            'supplier_name',
            'entry_date',
            'cost_code',
            'advance',
            'recovery_advance',
            'delivery',
            'retention',
            'release_retention',
            'net_payable_amount',
            'delivery_items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'serial_number',
            'supplier_name',
            'entry_date',
            'cost_code',
            'net_payable_amount',
            'delivery_items',
            'created_at',
            'updated_at',
        ]


class AssociatedCostPaymentItemCreateSerializer(serializers.Serializer):
    line_number = serializers.IntegerField(min_value=1)
    received_quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=6,
        required=False,
        default='0.00',
    )
    invoice_number = serializers.CharField(required=False, allow_blank=True)
    invoice_date = serializers.DateField(required=False, allow_null=True)
    gl_no = serializers.CharField(required=False, allow_blank=True)
    gl_date = serializers.DateField(required=False, allow_null=True)


class AssociatedCostPaymentEntrySerializer(serializers.Serializer):
    serial_number = serializers.CharField(max_length=100)
    advance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    recovery_advance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    delivery = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    retention = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    release_retention = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    delivery_items = AssociatedCostPaymentItemCreateSerializer(many=True, required=False)

    def validate_serial_number(self, value):
        if not AssociatedCostEntry.objects.filter(serial_number=value).exists():
            raise serializers.ValidationError('SN not found.')
        return value

    def validate(self, attrs):
        entry = AssociatedCostEntry.objects.get(serial_number=attrs['serial_number'])
        items_by_line_number = {
            item.line_number: item
            for item in entry.items.select_related('employee').all()
        }
        submitted_items = attrs.get('delivery_items', [])
        submitted_line_numbers = [item['line_number'] for item in submitted_items]

        if len(submitted_line_numbers) != len(set(submitted_line_numbers)):
            raise serializers.ValidationError(
                {'delivery_items': 'Duplicate item rows are not allowed.'}
            )

        invalid_line_numbers = set(submitted_line_numbers) - set(items_by_line_number.keys())
        if invalid_line_numbers:
            raise serializers.ValidationError(
                {'delivery_items': 'One or more delivery items do not belong to the selected SN.'}
            )

        for item in submitted_items:
            source_item = items_by_line_number[item['line_number']]
            received_quantity = item.get('received_quantity') or Decimal('0.00')

            if received_quantity < 0:
                raise serializers.ValidationError(
                    {'delivery_items': 'Received quantity cannot be negative.'}
                )

            if received_quantity > source_item.quantity:
                raise serializers.ValidationError(
                    {
                        'delivery_items': (
                            'Received quantity cannot be greater than the entered qty.'
                        )
                    }
                )

            if received_quantity > 0:
                if not item.get('invoice_number'):
                    raise serializers.ValidationError(
                        {'delivery_items': 'Invoice no. is required when quantity is received.'}
                    )
                if not item.get('invoice_date'):
                    raise serializers.ValidationError(
                        {'delivery_items': 'Invoice date is required when quantity is received.'}
                    )

        attrs['entry'] = entry
        return attrs


class PayrollRequestSerializer(serializers.Serializer):
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
    incentive = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        default='0.00',
    )

    def validate_employee_id(self, value):
        if not Employee.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError('Employee not found.')
        return value


class PayrollResponseSerializer(serializers.Serializer):
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
    total_ot_amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    leave_salary_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    gratuity_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    incentive = serializers.DecimalField(max_digits=12, decimal_places=2)

    advance_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    advance_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)
    other_deduction = serializers.DecimalField(max_digits=12, decimal_places=2)

    total_earned = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_pay = serializers.DecimalField(max_digits=12, decimal_places=2)


class PayrollRecordSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_name = serializers.CharField(source='employee.employee_name', read_only=True)

    class Meta:
        model = PayrollRecord
        fields = [
            'id',
            'employee',
            'employee_id',
            'employee_name',
            'month',
            'year',
            'payroll_date',
            'category',
            'calendar_days',
            'absent_days',
            'medical_leave_with_doc_days',
            'medical_leave_without_doc_days',
            'annual_leave_days',
            'total_working_days',
            'normal_ot_hours',
            'sunday_ot_hours',
            'public_holiday_ot_hours',
            'basic_salary_monthly',
            'basic_salary_earned',
            'other_allowances_monthly',
            'other_allowances_earned',
            'normal_ot_amount',
            'sunday_ot_amount',
            'public_holiday_ot_amount',
            'total_ot_amount',
            'leave_salary_amount',
            'gratuity_amount',
            'incentive',
            'advance_balance',
            'advance_deduction',
            'other_deduction',
            'total_earned',
            'total_deductions',
            'net_pay',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class SalaryActualIncurredCostRowSerializer(serializers.Serializer):
    sn = serializers.IntegerField()
    date = serializers.DateField()
    employee_name = serializers.CharField()
    employee_id = serializers.CharField()
    project_name = serializers.CharField()
    project_number = serializers.CharField()
    contribution_percentage = serializers.DecimalField(max_digits=8, decimal_places=2)
    cost_code = serializers.CharField()
    item_description = serializers.CharField()
    basic = serializers.DecimalField(max_digits=12, decimal_places=2)
    allowance = serializers.DecimalField(max_digits=12, decimal_places=2)
    ot = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    leave_salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    gratuity = serializers.DecimalField(max_digits=12, decimal_places=2)
    incentive = serializers.DecimalField(max_digits=12, decimal_places=2)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
