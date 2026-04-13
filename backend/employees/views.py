from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AnnualLeave,
    Employee,
    EmployeeDetailHistory,
    SalaryAdvance,
    TimeEntry,
    SalaryAdvanceDeduction,
)
from .serializers import (
    AnnualLeaveCreateSerializer,
    AnnualLeaveSerializer,
    EmployeeDetailHistorySerializer,
    EmployeeEntrySerializer,
    EmployeeSerializer,
    EmployeeUpdateSerializer,
    PayrollPreviewRequestSerializer,
    PayrollPreviewSerializer,
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


class EmployeeOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = Employee.objects.all().order_by('employee_id')
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)


class EmployeeDetailEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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

        total_time = Decimal('0.00')
        normal_ot = Decimal('0.00')
        sunday_ot = Decimal('0.00')
        public_holiday_ot = Decimal('0.00')

        start_time = data.get('start_time')
        finish_time = data.get('finish_time')

        if not is_leave_or_absent and start_time and finish_time:
            start_dt = datetime.combine(entry_date, start_time)
            finish_dt = datetime.combine(entry_date, finish_time)

            total_hours = Decimal((finish_dt - start_dt).total_seconds()) / Decimal('3600')
            total_time = total_hours.quantize(Decimal('0.01'))

            if employee_category == 'Labour':
                extra_hours = max(total_time - regular_duty_hours, Decimal('0.00'))
                extra_hours = extra_hours.quantize(Decimal('0.01'))

                if data.get('is_public_holiday'):
                    public_holiday_ot = extra_hours
                elif day == 'Sunday':
                    sunday_ot = extra_hours
                else:
                    normal_ot = extra_hours

        time_entry = TimeEntry.objects.create(
            employee=employee,
            date=entry_date,
            day=day,
            is_public_holiday=data.get('is_public_holiday', False),
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


class AnnualLeaveCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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


class PayrollPreviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PayrollPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        employee = Employee.objects.get(employee_id=data['employee_id'])
        month = data['month']
        year = data['year']
        other_deduction = data.get('other_deduction', Decimal('0.00'))
        advance_deduction = data.get('advance_deduction', Decimal('0.00'))

        month_start = date(year, month, 1)
        month_end = date(year, month, monthrange(year, month)[1])
        calendar_days = monthrange(year, month)[1]

        if month == 1:
            previous_month_end = date(year - 1, 12, 31)
        else:
            previous_month = month - 1
            previous_month_end = date(
                year,
                previous_month,
                monthrange(year, previous_month)[1],
            )

        salary_row = (
            EmployeeDetailHistory.objects
            .filter(employee=employee, salary_start_date__lte=month_end)
            .filter(Q(salary_end_date__isnull=True) | Q(salary_end_date__gte=month_start))
            .order_by('-salary_start_date', '-created_at')
            .first()
        )

        if not salary_row:
            return Response(
                {'detail': 'Salary record not found for the selected month.'},
                status=status.HTTP_404_NOT_FOUND,
            )

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
            return Response(
                {'detail': 'Advance deduction cannot be greater than advance balance.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_earned = to_money(
            basic_salary_earned
            + other_allowances_earned
            + normal_ot_amount
            + sunday_ot_amount
            + public_holiday_ot_amount
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
            'advance_balance': advance_balance,
            'advance_deduction': advance_deduction,
            'other_deduction': other_deduction,
            'total_earned': total_earned,
            'total_deductions': total_deductions,
            'net_pay': net_pay,
        }

        response_serializer = PayrollPreviewSerializer(payload)
        return Response(response_serializer.data)
