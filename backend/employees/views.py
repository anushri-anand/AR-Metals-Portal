from collections import defaultdict
from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from production.models import TimeAllocationLine
from shared.company import get_company_from_request
from shared.period_closing import (
    ensure_request_dates_in_open_period,
    validate_month_in_open_period,
)

from .models import (
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
from .serializers import (
    AnnualLeaveCreateSerializer,
    AnnualLeaveSerializer,
    AssociatedCostEntryCreateSerializer,
    AssociatedCostEntrySerializer,
    AssociatedCostPaymentEntrySerializer,
    AssociatedCostPaymentSerializer,
    EmployeeDetailHistorySerializer,
    EmployeeEntrySerializer,
    EmployeeSerializer,
    EmployeeUpdateSerializer,
    PayrollRequestSerializer,
    PayrollResponseSerializer,
    SalaryActualIncurredCostRowSerializer,
    SalaryAdvanceCreateSerializer,
    SalaryAdvanceSerializer,
    TimeEntryCreateSerializer,
    TimeEntrySerializer,
)

def to_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def get_overlap_days(
    start_date: date,
    end_date: date,
    month_start: date,
    month_end: date,
) -> int:
    overlap_start = max(start_date, month_start)
    overlap_end = min(end_date, month_end)

    if overlap_end < overlap_start:
        return 0

    return (overlap_end - overlap_start).days + 1


def generate_next_associated_cost_serial(
    entry_type: str = AssociatedCostEntry.TYPE_LABOUR,
) -> str:
    prefix = 'LAC' if entry_type == AssociatedCostEntry.TYPE_LABOUR else 'OAC'
    next_number = 1

    for serial_number in AssociatedCostEntry.objects.values_list('serial_number', flat=True):
        if not str(serial_number).startswith(prefix):
            continue

        suffix = str(serial_number)[3:]
        if suffix.isdigit():
            next_number = max(next_number, int(suffix) + 1)

    return f'{prefix}{next_number:03d}'


def get_month_end(target_year: int, target_month: int) -> date:
    return date(target_year, target_month, monthrange(target_year, target_month)[1])


def get_month_start(target_year: int, target_month: int) -> date:
    return date(target_year, target_month, 1)


def get_next_month_start(value: date) -> date:
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)


def add_years_safe(value: date, years: int) -> date:
    try:
        return value.replace(year=value.year + years)
    except ValueError:
        return value.replace(month=2, day=28, year=value.year + years)


def get_salary_row_for_month(employee: Employee, month_start: date, month_end: date):
    return (
        EmployeeDetailHistory.objects
        .filter(employee=employee, salary_start_date__lte=month_end)
        .filter(Q(salary_end_date__isnull=True) | Q(salary_end_date__gte=month_start))
        .order_by('-salary_start_date', '-created_at')
        .first()
    )


def get_employment_start_date(employee: Employee):
    first_history_row = (
        EmployeeDetailHistory.objects
        .filter(employee=employee)
        .order_by('employment_start_date', 'created_at')
        .first()
    )
    return first_history_row.employment_start_date if first_history_row else None


def get_month_label(target_month: int, target_year: int) -> str:
    return date(target_year, target_month, 1).strftime('%B %Y')


def compute_monthly_gratuity_amount(
    basic_salary_monthly: Decimal,
    employment_start_date: date,
    month_end: date,
) -> Decimal:
    if not employment_start_date:
        return Decimal('0.00')

    five_year_anniversary = add_years_safe(employment_start_date, 5)
    gratuity_days = Decimal('21') if month_end < five_year_anniversary else Decimal('30')
    annual_gratuity_amount = (
        gratuity_days * basic_salary_monthly * Decimal('12')
    ) / Decimal('365')

    # We treat gratuity as a monthly accrual in the monthly actual incurred cost table.
    return to_money(annual_gratuity_amount / Decimal('12'))


def build_payroll_payload(
    employee: Employee,
    month: int,
    year: int,
    advance_deduction: Decimal = Decimal('0.00'),
    other_deduction: Decimal = Decimal('0.00'),
    incentive: Decimal = Decimal('0.00'),
):
    month_start = get_month_start(year, month)
    month_end = get_month_end(year, month)
    calendar_days = monthrange(year, month)[1]

    if month == 1:
        previous_month_end = date(year - 1, 12, 31)
    else:
        previous_month_end = get_month_end(year, month - 1)

    salary_row = get_salary_row_for_month(employee, month_start, month_end)

    if not salary_row:
        return None

    time_entries = TimeEntry.objects.filter(
        employee=employee,
        date__gte=month_start,
        date__lte=month_end,
    )

    absent_days = (
        time_entries.filter(absent=True)
        .values('date')
        .distinct()
        .count()
    )

    medical_leave_with_doc_days = (
        time_entries.filter(medical_leave_with_doc=True)
        .values('date')
        .distinct()
        .count()
    )

    medical_leave_without_doc_days = (
        time_entries.filter(medical_leave_without_doc=True)
        .values('date')
        .distinct()
        .count()
    )

    annual_leaves = AnnualLeave.objects.filter(
        employee=employee,
        from_date__lte=month_end,
        to_date__gte=month_start,
    )

    annual_leave_days = sum(
        get_overlap_days(
            annual_leave.from_date,
            annual_leave.to_date,
            month_start,
            month_end,
        )
        for annual_leave in annual_leaves
    )

    total_working_days = max(
        calendar_days - absent_days - medical_leave_without_doc_days,
        0,
    )

    if salary_row.category == 'Labour':
        normal_ot_hours = (
            time_entries.aggregate(total=Sum('normal_ot'))['total']
            or Decimal('0.00')
        )
        sunday_ot_hours = (
            time_entries.aggregate(total=Sum('sunday_ot'))['total']
            or Decimal('0.00')
        )
        public_holiday_ot_hours = (
            time_entries.aggregate(total=Sum('public_holiday_ot'))['total']
            or Decimal('0.00')
        )
    else:
        normal_ot_hours = Decimal('0.00')
        sunday_ot_hours = Decimal('0.00')
        public_holiday_ot_hours = Decimal('0.00')

    basic_salary_monthly = salary_row.basic_salary
    other_allowances_monthly = salary_row.allowances

    basic_salary_earned = to_money(
        (Decimal(total_working_days) / Decimal(calendar_days)) * basic_salary_monthly
    )

    if total_working_days > 15:
        other_allowances_earned = to_money(other_allowances_monthly)
    else:
        other_allowances_earned = to_money(
            (Decimal(total_working_days) / Decimal(calendar_days)) * other_allowances_monthly
        )

    ot_base_rate = (
        basic_salary_monthly * Decimal('12')
    ) / (Decimal('365') * Decimal('8'))

    normal_ot_amount = to_money(ot_base_rate * normal_ot_hours)
    sunday_ot_amount = to_money(ot_base_rate * sunday_ot_hours * Decimal('1.25'))
    public_holiday_ot_amount = to_money(
        ot_base_rate * public_holiday_ot_hours * Decimal('2')
    )
    total_ot_amount = to_money(
        normal_ot_amount + sunday_ot_amount + public_holiday_ot_amount
    )

    employment_start_date = salary_row.employment_start_date
    total_advance_paid = (
        SalaryAdvance.objects.filter(
            employee=employee,
            advance_date__gte=employment_start_date,
            advance_date__lte=month_end,
        ).aggregate(total=Sum('amount'))['total']
        or Decimal('0.00')
    )

    total_advance_deducted_until_previous_month = (
        SalaryAdvanceDeduction.objects.filter(
            employee=employee,
            deduction_date__gte=employment_start_date,
            deduction_date__lte=previous_month_end,
        ).aggregate(total=Sum('amount'))['total']
        or Decimal('0.00')
    )

    advance_balance = to_money(
        total_advance_paid - total_advance_deducted_until_previous_month
    )

    if advance_deduction > advance_balance:
        raise ValueError('Advance deduction cannot be greater than advance balance.')

    leave_salary_amount = to_money(
        (basic_salary_monthly + other_allowances_monthly) / Decimal('12')
    )
    gratuity_amount = compute_monthly_gratuity_amount(
        basic_salary_monthly,
        employment_start_date,
        month_end,
    )

    total_earned = to_money(
        basic_salary_earned
        + other_allowances_earned
        + normal_ot_amount
        + sunday_ot_amount
        + public_holiday_ot_amount
        + incentive
    )

    total_deductions = to_money(advance_deduction + other_deduction)
    net_pay = to_money(total_earned - total_deductions)

    payload = {
        'employee_id': employee.employee_id,
        'employee_name': employee.employee_name,
        'month': month,
        'year': year,
        'calendar_days': calendar_days,
        'absent_days': absent_days,
        'medical_leave_with_doc_days': medical_leave_with_doc_days,
        'medical_leave_without_doc_days': medical_leave_without_doc_days,
        'annual_leave_days': annual_leave_days,
        'total_working_days': total_working_days,
        'normal_ot_hours': normal_ot_hours,
        'sunday_ot_hours': sunday_ot_hours,
        'public_holiday_ot_hours': public_holiday_ot_hours,
        'basic_salary_monthly': basic_salary_monthly,
        'basic_salary_earned': basic_salary_earned,
        'other_allowances_monthly': other_allowances_monthly,
        'other_allowances_earned': other_allowances_earned,
        'normal_ot_amount': normal_ot_amount,
        'sunday_ot_amount': sunday_ot_amount,
        'public_holiday_ot_amount': public_holiday_ot_amount,
        'total_ot_amount': total_ot_amount,
        'leave_salary_amount': leave_salary_amount,
        'gratuity_amount': gratuity_amount,
        'incentive': to_money(incentive),
        'advance_balance': advance_balance,
        'advance_deduction': to_money(advance_deduction),
        'other_deduction': to_money(other_deduction),
        'total_earned': total_earned,
        'total_deductions': total_deductions,
        'net_pay': net_pay,
        'category': salary_row.category,
        'employment_start_date': employment_start_date,
        'payroll_date': month_end,
    }

    return payload


def calculate_time_entry_overtime(
    employee_category,
    total_time: Decimal,
    regular_duty_hours: Decimal,
    is_public_holiday: bool,
    day: str,
    is_leave_or_absent: bool,
):
    normal_ot = Decimal('0.00')
    sunday_ot = Decimal('0.00')
    public_holiday_ot = Decimal('0.00')

    if employee_category != 'Labour' or is_leave_or_absent:
        return normal_ot, sunday_ot, public_holiday_ot

    if is_public_holiday:
        if total_time > Decimal('6.00'):
            public_holiday_ot = max(total_time - Decimal('1.00'), Decimal('0.00'))
        else:
            public_holiday_ot = max(total_time, Decimal('0.00'))
        return normal_ot, sunday_ot, public_holiday_ot.quantize(Decimal('0.01'))

    extra_hours = max(total_time - regular_duty_hours, Decimal('0.00')).quantize(Decimal('0.01'))

    if day == 'Sunday':
        sunday_ot = extra_hours
    else:
        normal_ot = extra_hours

    return normal_ot, sunday_ot, public_holiday_ot


def refresh_public_holiday_entries(entry_date: date):
    holiday_entries = (
        TimeEntry.objects
        .select_related('employee')
        .filter(date=entry_date)
    )

    for entry in holiday_entries:
        current_detail = (
            EmployeeDetailHistory.objects
            .filter(employee=entry.employee, is_current=True)
            .order_by('-salary_start_date', '-created_at')
            .first()
        )
        employee_category = current_detail.category if current_detail else None
        is_leave_or_absent = (
            entry.medical_leave_with_doc
            or entry.medical_leave_without_doc
            or entry.absent
        )
        normal_ot, sunday_ot, public_holiday_ot = calculate_time_entry_overtime(
            employee_category=employee_category,
            total_time=entry.total_time,
            regular_duty_hours=entry.regular_duty_hours,
            is_public_holiday=True,
            day=entry.day,
            is_leave_or_absent=is_leave_or_absent,
        )

        entry.is_public_holiday = True
        entry.normal_ot = normal_ot
        entry.sunday_ot = sunday_ot
        entry.public_holiday_ot = public_holiday_ot
        entry.save(
            update_fields=[
                'is_public_holiday',
                'normal_ot',
                'sunday_ot',
                'public_holiday_ot',
            ]
        )


class EmployeeOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = Employee.objects.prefetch_related('detail_history').all().order_by('employee_id')
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)


class EmployeeDetailEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = EmployeeEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee_id = data['employee_id'].strip()
        employee_name = data['employee_name'].strip()

        with transaction.atomic():
            if Employee.objects.filter(employee_id=employee_id).exists():
                return Response(
                    {'detail': 'Employee already exists. Use update instead.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            employee = Employee.objects.create(
                employee_id=employee_id,
                employee_name=employee_name,
            )

            history_row = EmployeeDetailHistory.objects.create(
                employee=employee,
                designation=data['designation'],
                category=data['category'],
                visa_start_date=data.get('visa_start_date'),
                visa_end_date=data.get('visa_end_date'),
                passport_expiry_date=data.get('passport_expiry_date'),
                visa_under=data['visa_under'],
                basic_salary=data['basic_salary'],
                allowances=data['allowances'],
                salary_start_date=data['salary_start_date'],
                salary_end_date=None,
                employment_start_date=data['employment_start_date'],
                employment_end_date=None,
                is_current=True,
            )

        response_serializer = EmployeeDetailHistorySerializer(history_row)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class EmployeeDetailUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = EmployeeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = Employee.objects.get(employee_id=data['employee_id'])

        current_row = (
            EmployeeDetailHistory.objects
            .filter(employee=employee, is_current=True)
            .order_by('-salary_start_date', '-created_at')
            .first()
        )

        if not current_row:
            return Response(
                {'detail': 'Current employee record not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_salary_start_date = data.get('salary_start_date')

        salary_values_changed = (
            data['basic_salary'] != current_row.basic_salary or
            data['allowances'] != current_row.allowances
        )

        if salary_values_changed and not new_salary_start_date:
            return Response(
                {'detail': 'Salary start date is required when salary or allowances are updated.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_salary_start_date and new_salary_start_date <= current_row.salary_start_date:
            return Response(
                {'detail': 'New salary start date must be after the current salary start date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            current_row.is_current = False
            update_fields = ['is_current']

            next_salary_start_date = current_row.salary_start_date
            next_salary_end_date = current_row.salary_end_date

            if new_salary_start_date:
                current_row.salary_end_date = new_salary_start_date - timedelta(days=1)
                update_fields.append('salary_end_date')
                next_salary_start_date = new_salary_start_date
                next_salary_end_date = None

            current_row.save(update_fields=update_fields)

            new_row = EmployeeDetailHistory.objects.create(
                employee=employee,
                designation=data['designation'],
                category=data['category'],
                visa_start_date=data.get('visa_start_date'),
                visa_end_date=data.get('visa_end_date'),
                passport_expiry_date=data.get('passport_expiry_date'),
                visa_under=current_row.visa_under,
                basic_salary=data['basic_salary'],
                allowances=data['allowances'],
                salary_start_date=next_salary_start_date,
                salary_end_date=next_salary_end_date,
                employment_start_date=current_row.employment_start_date,
                employment_end_date=data.get('employment_end_date', current_row.employment_end_date),
                is_current=True,
            )

        response_serializer = EmployeeDetailHistorySerializer(new_row)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

class EmployeeDetailHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee_id = request.query_params.get('employee_id')

        queryset = EmployeeDetailHistory.objects.select_related('employee').all()

        if employee_id:
            queryset = queryset.filter(employee__employee_id=employee_id)

        queryset = queryset.order_by('employee__employee_id', '-salary_start_date', '-created_at')

        serializer = EmployeeDetailHistorySerializer(queryset, many=True)
        return Response(serializer.data)


class TimeEntryCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = TimeEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = Employee.objects.get(employee_id=data['employee_id'])
        current_detail = (
            EmployeeDetailHistory.objects
            .filter(employee=employee, is_current=True)
            .order_by('-salary_start_date', '-created_at')
            .first()
        )

        employee_category = current_detail.category if current_detail else None

        entry_date = data['date']
        day = entry_date.strftime('%A')

        medical_leave_with_doc = data.get('medical_leave_with_doc', False)
        medical_leave_without_doc = data.get('medical_leave_without_doc', False)
        absent = data.get('absent', False)
        is_leave_or_absent = medical_leave_with_doc or medical_leave_without_doc or absent

        regular_duty_hours = Decimal(data['regular_duty_hours'])
        is_public_holiday = data.get('is_public_holiday', False) or TimeEntry.objects.filter(
            date=entry_date,
            is_public_holiday=True,
        ).exists()

        total_time = Decimal('0.00')

        start_time = data.get('start_time')
        finish_time = data.get('finish_time')

        if not is_leave_or_absent and start_time and finish_time:
            start_dt = datetime.combine(entry_date, start_time)
            finish_dt = datetime.combine(entry_date, finish_time)

            total_hours = Decimal((finish_dt - start_dt).total_seconds()) / Decimal('3600')
            total_time = total_hours.quantize(Decimal('0.01'))

        normal_ot, sunday_ot, public_holiday_ot = calculate_time_entry_overtime(
            employee_category=employee_category,
            total_time=total_time,
            regular_duty_hours=regular_duty_hours,
            is_public_holiday=is_public_holiday,
            day=day,
            is_leave_or_absent=is_leave_or_absent,
        )

        time_entry = TimeEntry.objects.create(
            employee=employee,
            date=entry_date,
            day=day,
            is_public_holiday=is_public_holiday,
            start_time=start_time,
            finish_time=finish_time,
            total_time=total_time,
            regular_duty_hours=regular_duty_hours,
            normal_ot=normal_ot,
            sunday_ot=sunday_ot,
            public_holiday_ot=public_holiday_ot,
            medical_leave_with_doc=medical_leave_with_doc,
            medical_leave_without_doc=medical_leave_without_doc,
            absent=absent,
            remarks=data.get('remarks', ''),
        )

        if is_public_holiday:
            refresh_public_holiday_entries(entry_date)

        response_serializer = TimeEntrySerializer(time_entry)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

class TimeEntryListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee_id = request.query_params.get('employee_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        queryset = TimeEntry.objects.select_related('employee').all()

        if employee_id:
            queryset = queryset.filter(employee__employee_id=employee_id)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        queryset = queryset.order_by('-date', 'employee__employee_id', '-created_at')

        serializer = TimeEntrySerializer(queryset, many=True)
        return Response(serializer.data)


class PublicHolidayDateListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        holiday_dates = (
            TimeEntry.objects
            .filter(is_public_holiday=True)
            .values_list('date', flat=True)
            .distinct()
            .order_by('date')
        )
        return Response([holiday_date.isoformat() for holiday_date in holiday_dates])


class AnnualLeaveCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = AnnualLeaveCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = Employee.objects.get(employee_id=data['employee_id'])

        annual_leave = AnnualLeave.objects.create(
            employee=employee,
            from_date=data['from_date'],
            to_date=data['to_date'],
            remarks=data.get('remarks', ''),
        )

        response_serializer = AnnualLeaveSerializer(annual_leave)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SalaryAdvanceCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = SalaryAdvanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = Employee.objects.get(employee_id=data['employee_id'])

        salary_advance = SalaryAdvance.objects.create(
            employee=employee,
            advance_date=data['advance_date'],
            amount=data['amount'],
            remarks=data.get('remarks', ''),
        )

        response_serializer = SalaryAdvanceSerializer(salary_advance)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AssociatedCostEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = AssociatedCostEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            serial_number = generate_next_associated_cost_serial(data['entry_type'])
            while AssociatedCostEntry.objects.filter(serial_number=serial_number).exists():
                serial_number = generate_next_associated_cost_serial(data['entry_type'])

            entry = AssociatedCostEntry.objects.create(
                serial_number=serial_number,
                entry_type=data['entry_type'],
                supplier_name=data['supplier_name'].strip(),
                date=data['date'],
                cost_code=data['cost_code'],
            )

            for index, item in enumerate(data['items'], start=1):
                employee = (
                    Employee.objects.get(employee_id=item['employee_id'])
                    if item.get('employee_id')
                    else None
                )
                AssociatedCostItem.objects.create(
                    entry=entry,
                    line_number=index,
                    employee=employee,
                    account_code=item.get('account_code', '').strip(),
                    cost_code=item.get('cost_code', entry.cost_code),
                    item_description=item['item_description'].strip(),
                    quantity=item['quantity'],
                    unit=item.get('unit', '').strip(),
                    rate=item['rate'],
                    vat_percent=item.get('vat_percent', Decimal('0.00')),
                    amount=item['amount'],
                    start_date=item['start_date'],
                    end_date=item['end_date'],
                )

        return Response(
            AssociatedCostEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class AssociatedCostEntryListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entries = AssociatedCostEntry.objects.prefetch_related(
            'items',
            'items__employee',
        ).all()
        serializer = AssociatedCostEntrySerializer(entries, many=True)
        return Response(serializer.data)


class AssociatedCostPaymentEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = AssociatedCostPaymentEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        entry = data['entry']
        entry_items = {
            item.line_number: item
            for item in entry.items.select_related('employee').all()
        }
        submitted_delivery_items = {
            item['line_number']: item
            for item in data.get('delivery_items', [])
        }
        delivery_total = sum(
            entry_item.rate * (submitted_delivery_items.get(line_number, {}).get('received_quantity') or 0)
            for line_number, entry_item in entry_items.items()
        )

        existing_payment = AssociatedCostPayment.objects.filter(entry=entry).first()

        with transaction.atomic():
            if existing_payment:
                payment = existing_payment
                payment.advance = data.get('advance', Decimal('0.00'))
                payment.recovery_advance = data.get('recovery_advance', Decimal('0.00'))
                payment.delivery = delivery_total or data.get('delivery', Decimal('0.00'))
                payment.retention = data.get('retention', Decimal('0.00'))
                payment.release_retention = data.get('release_retention', Decimal('0.00'))
                payment.save(
                    update_fields=[
                        'advance',
                        'recovery_advance',
                        'delivery',
                        'retention',
                        'release_retention',
                        'updated_at',
                    ]
                )
                payment.delivery_items.all().delete()
            else:
                payment = AssociatedCostPayment.objects.create(
                    entry=entry,
                    advance=data.get('advance', Decimal('0.00')),
                    recovery_advance=data.get('recovery_advance', Decimal('0.00')),
                    delivery=delivery_total or data.get('delivery', Decimal('0.00')),
                    retention=data.get('retention', Decimal('0.00')),
                    release_retention=data.get('release_retention', Decimal('0.00')),
                )

            for line_number, entry_item in entry_items.items():
                submitted_item = submitted_delivery_items.get(line_number, {})
                AssociatedCostPaymentItem.objects.create(
                    payment=payment,
                    line_number=line_number,
                    employee=entry_item.employee,
                    account_code=entry_item.account_code,
                    cost_code=entry_item.cost_code,
                    item_description=entry_item.item_description,
                    quantity=entry_item.quantity,
                    unit=entry_item.unit,
                    rate=entry_item.rate,
                    received_quantity=submitted_item.get('received_quantity', Decimal('0.00')),
                    invoice_number=submitted_item.get('invoice_number', ''),
                    invoice_date=submitted_item.get('invoice_date'),
                    gl_no=submitted_item.get('gl_no', ''),
                    gl_date=submitted_item.get('gl_date'),
                )

        return Response(
            AssociatedCostPaymentSerializer(payment).data,
            status=status.HTTP_200_OK if existing_payment else status.HTTP_201_CREATED,
        )


class AssociatedCostPaymentListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = AssociatedCostPayment.objects.select_related('entry').prefetch_related(
            'delivery_items',
            'delivery_items__employee',
        )
        serializer = AssociatedCostPaymentSerializer(payments, many=True)
        return Response(serializer.data)


class PayrollPreviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        serializer = PayrollRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        validate_month_in_open_period(
            data['year'],
            data['month'],
            company,
            'Payroll period',
        )

        employee = Employee.objects.get(employee_id=data['employee_id'])
        try:
            payload = build_payroll_payload(
                employee=employee,
                month=data['month'],
                year=data['year'],
                advance_deduction=data.get('advance_deduction', Decimal('0.00')),
                other_deduction=data.get('other_deduction', Decimal('0.00')),
                incentive=data.get('incentive', Decimal('0.00')),
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not payload:
            return Response(
                {'detail': 'Salary record not found for the selected month.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        response_serializer = PayrollResponseSerializer(payload)
        return Response(response_serializer.data)


class PayrollGenerateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request, required=False)
        serializer = PayrollRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        validate_month_in_open_period(
            data['year'],
            data['month'],
            company,
            'Payroll period',
        )

        employee = Employee.objects.get(employee_id=data['employee_id'])
        target_month = data['month']
        target_year = data['year']
        target_month_end = get_month_end(target_year, target_month)
        employment_start_date = get_employment_start_date(employee)

        if not employment_start_date:
            return Response(
                {'detail': 'Employment start date not found for this employee.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        current_month_start = get_month_start(
            employment_start_date.year,
            employment_start_date.month,
        )
        target_month_start = get_month_start(target_year, target_month)
        target_payload = None

        with transaction.atomic():
            while current_month_start <= target_month_start:
                current_month = current_month_start.month
                current_year = current_month_start.year
                existing_record = PayrollRecord.objects.filter(
                    employee=employee,
                    month=current_month,
                    year=current_year,
                ).first()

                if current_month == target_month and current_year == target_year:
                    advance_deduction = data.get('advance_deduction', Decimal('0.00'))
                    other_deduction = data.get('other_deduction', Decimal('0.00'))
                    incentive = data.get('incentive', Decimal('0.00'))
                else:
                    existing_deduction = SalaryAdvanceDeduction.objects.filter(
                        employee=employee,
                        deduction_month=current_month,
                        deduction_year=current_year,
                    ).first()
                    advance_deduction = (
                        existing_record.advance_deduction
                        if existing_record
                        else existing_deduction.amount if existing_deduction else Decimal('0.00')
                    )
                    other_deduction = (
                        existing_record.other_deduction
                        if existing_record
                        else Decimal('0.00')
                    )
                    incentive = (
                        existing_record.incentive
                        if existing_record
                        else Decimal('0.00')
                    )

                try:
                    payload = build_payroll_payload(
                        employee=employee,
                        month=current_month,
                        year=current_year,
                        advance_deduction=advance_deduction,
                        other_deduction=other_deduction,
                        incentive=incentive,
                    )
                except ValueError as exc:
                    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

                if payload:
                    payroll_date = payload['payroll_date']
                    PayrollRecord.objects.update_or_create(
                        employee=employee,
                        month=current_month,
                        year=current_year,
                        defaults={
                            'payroll_date': payroll_date,
                            'category': payload['category'],
                            'calendar_days': payload['calendar_days'],
                            'absent_days': payload['absent_days'],
                            'medical_leave_with_doc_days': payload['medical_leave_with_doc_days'],
                            'medical_leave_without_doc_days': payload['medical_leave_without_doc_days'],
                            'annual_leave_days': payload['annual_leave_days'],
                            'total_working_days': payload['total_working_days'],
                            'normal_ot_hours': payload['normal_ot_hours'],
                            'sunday_ot_hours': payload['sunday_ot_hours'],
                            'public_holiday_ot_hours': payload['public_holiday_ot_hours'],
                            'basic_salary_monthly': payload['basic_salary_monthly'],
                            'basic_salary_earned': payload['basic_salary_earned'],
                            'other_allowances_monthly': payload['other_allowances_monthly'],
                            'other_allowances_earned': payload['other_allowances_earned'],
                            'normal_ot_amount': payload['normal_ot_amount'],
                            'sunday_ot_amount': payload['sunday_ot_amount'],
                            'public_holiday_ot_amount': payload['public_holiday_ot_amount'],
                            'total_ot_amount': payload['total_ot_amount'],
                            'leave_salary_amount': payload['leave_salary_amount'],
                            'gratuity_amount': payload['gratuity_amount'],
                            'incentive': payload['incentive'],
                            'advance_balance': payload['advance_balance'],
                            'advance_deduction': payload['advance_deduction'],
                            'other_deduction': payload['other_deduction'],
                            'total_earned': payload['total_earned'],
                            'total_deductions': payload['total_deductions'],
                            'net_pay': payload['net_pay'],
                        },
                    )

                    SalaryAdvanceDeduction.objects.update_or_create(
                        employee=employee,
                        deduction_month=current_month,
                        deduction_year=current_year,
                        defaults={
                            'deduction_date': payroll_date,
                            'amount': payload['advance_deduction'],
                            'remarks': 'Saved from payroll generation.',
                        },
                    )

                    if current_month == target_month and current_year == target_year:
                        target_payload = payload

                current_month_start = get_next_month_start(current_month_start)

        if not target_payload:
            return Response(
                {'detail': 'Salary record not found for the selected month.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        response_serializer = PayrollResponseSerializer(target_payload)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class SalaryActualIncurredCostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payroll_records = (
            PayrollRecord.objects.select_related('employee')
            .all()
            .order_by('payroll_date', 'employee__employee_id', 'id')
        )

        rows = []
        next_sn = 1

        for record in payroll_records:
            month_start = get_month_start(record.year, record.month)
            month_end = record.payroll_date
            allocation_lines = TimeAllocationLine.objects.select_related('entry').filter(
                entry__employee_id=record.employee.employee_id,
                entry__date__gte=month_start,
                entry__date__lte=month_end,
            )

            grouped_percentages = defaultdict(Decimal)
            grouped_project_names = {}

            default_cost_code = (
                'Production Labour' if record.category == 'Labour' else 'FOH'
            )

            for line in allocation_lines:
                line_cost_code = str(line.entry.cost_code or '').strip() or default_cost_code
                group_key = (
                    line.project_number or '',
                    line.project_name or '',
                    line_cost_code,
                )
                grouped_percentages[group_key] += Decimal(line.percentage or 0)
                grouped_project_names[group_key] = {
                    'project_number': line.project_number or '',
                    'project_name': line.project_name or '',
                    'cost_code': line_cost_code,
                }

            total_percentage = sum(grouped_percentages.values(), Decimal('0.00'))
            if total_percentage <= 0:
                project_groups = [
                    {
                        'project_number': '-',
                        'project_name': 'Unallocated',
                        'contribution_percentage': Decimal('100.00'),
                        'cost_code': default_cost_code,
                    }
                ]
            else:
                project_groups = []
                for group_key, group_percentage in grouped_percentages.items():
                    normalized_percentage = to_money(
                        (group_percentage / total_percentage) * Decimal('100')
                    )
                    project_data = grouped_project_names[group_key]
                    project_groups.append(
                        {
                            'project_number': project_data['project_number'] or '-',
                            'project_name': project_data['project_name'] or '-',
                            'contribution_percentage': normalized_percentage,
                            'cost_code': project_data['cost_code'] or default_cost_code,
                        }
                    )

            for project_group in project_groups:
                contribution_ratio = (
                    Decimal(project_group['contribution_percentage']) / Decimal('100')
                )
                basic = to_money(record.basic_salary_monthly * contribution_ratio)
                allowance = to_money(record.other_allowances_monthly * contribution_ratio)
                ot = to_money(record.total_ot_amount * contribution_ratio)
                gross_salary = to_money(basic + allowance + ot)
                leave_salary = to_money(record.leave_salary_amount * contribution_ratio)
                gratuity = to_money(record.gratuity_amount * contribution_ratio)
                incentive = to_money(record.incentive * contribution_ratio)
                amount = to_money(
                    gross_salary + leave_salary + gratuity + incentive
                )

                rows.append(
                    {
                        'sn': next_sn,
                        'date': record.payroll_date,
                        'employee_name': record.employee.employee_name,
                        'employee_id': record.employee.employee_id,
                        'project_name': project_group['project_name'],
                        'project_number': project_group['project_number'],
                        'contribution_percentage': project_group['contribution_percentage'],
                        'cost_code': project_group['cost_code'],
                        'item_description': (
                            f'Salary for the month of {get_month_label(record.month, record.year)}'
                        ),
                        'basic': basic,
                        'allowance': allowance,
                        'ot': ot,
                        'gross_salary': gross_salary,
                        'leave_salary': leave_salary,
                        'gratuity': gratuity,
                        'incentive': incentive,
                        'amount': amount,
                    }
                )
                next_sn += 1

        serializer = SalaryActualIncurredCostRowSerializer(rows, many=True)
        return Response(serializer.data)
