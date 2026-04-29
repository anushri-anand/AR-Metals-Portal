from collections import defaultdict
from datetime import date, timedelta
import re
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from accounts.roles import ROLE_ADMIN, get_user_role
from accounts.permissions import ApiRoleAccessPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from employees.models import EmployeeDetailHistory, TimeEntry
from estimation.models import (
    BoqItem,
    ContractRevenue,
    ContractVariationLog,
    TenderCosting,
    TenderLog,
)
from shared.account_codes import normalize_account_code_for_cost_code
from shared.company import get_company_from_request
from shared.period_closing import ensure_request_dates_in_open_period

from .models import (
    DeliveryEntry,
    ProjectDetail,
    ProjectItem,
    ProjectVariation,
    ProjectVariationItem,
    TimeAllocationEntry,
    TimeAllocationLine,
    WorkCompletionEntry,
)
from .serializers import (
    DeliveryEntryCreateSerializer,
    DeliveryEntrySerializer,
    ProjectDetailCreateSerializer,
    ProjectDetailSerializer,
    ProjectDetailUpdateSerializer,
    ProductionStatusBreakdownRequestSerializer,
    ProductionStatusSummaryRequestSerializer,
    TimeAllocationEntryCreateSerializer,
    TimeAllocationEntrySerializer,
    TimeAllocationLineSerializer,
    ProjectVariationCreateSerializer,
    ProjectVariationSerializer,
    WorkCompletionEntryCreateSerializer,
    WorkCompletionEntrySerializer,
)

PRODUCTION_STAGE_FIELDS = [
    ('cutting', 'Cutting'),
    ('grooving', 'Grooving'),
    ('bending', 'Bending'),
    ('fabrication', 'Fabrication'),
    ('welding', 'Welding'),
    ('finishing', 'Finishing'),
    ('coating', 'Coating'),
    ('assembly', 'Assembly'),
    ('installation', 'Installation'),
    ('delivery', 'Delivery'),
]
WORK_COMPLETION_STAGE_KEYS = [key for key, _ in PRODUCTION_STAGE_FIELDS if key != 'delivery']
TIME_ALLOCATION_LABOUR_COST_CODES = {'Production Labour', 'Installation Labour'}
ALL_VARIATIONS_VALUE = '__ALL__'
ORIGINAL_CONTRACT_WORK_ORDER = 'OC'
MH_COMPARISON_STAGES = [
    'Cutting',
    'Grooving',
    'Bending',
    'Fabrication',
    'Welding',
    'Finishing',
    'Coating',
    'Assembly',
    'Installation',
]


def get_revision_sort_key(value):
    text = str(value or '').strip()
    numbers = re.findall(r'\d+', text)

    if numbers:
        return (1, int(numbers[-1]), text)

    return (0, 0, text)


def normalize_variation_number(value):
    text = str(value or '').strip()

    if not text:
        return ''

    if text == ALL_VARIATIONS_VALUE:
        return ALL_VARIATIONS_VALUE

    numbers = re.findall(r'\d+', text)

    if numbers:
        return f'RFV #{int(numbers[-1])}'

    return text


def get_variation_sort_key(value):
    normalized_value = normalize_variation_number(value)

    if not normalized_value:
        return (0, 0, normalized_value)

    if normalized_value == ALL_VARIATIONS_VALUE:
        return (1, 0, normalized_value)

    numbers = re.findall(r'\d+', normalized_value)

    if numbers:
        return (2, int(numbers[-1]), normalized_value)

    return (3, 0, normalized_value)


def get_estimated_mh(costing):
    if not costing:
        return Decimal('0.00')

    return sum((line.hours for line in costing.labour_lines.all()), Decimal('0.00'))


def serialize_decimal(value):
    return f'{Decimal(value or 0).quantize(Decimal("0.01"))}'


def get_employee_category(employee_id):
    detail = (
        EmployeeDetailHistory.objects.filter(employee__employee_id=employee_id)
        .order_by('-is_current', '-salary_start_date', '-created_at')
        .first()
    )
    return detail.category if detail else ''


def normalize_time_allocation_cost_codes(employee_id, cost_code, account_code):
    employee_category = get_employee_category(employee_id)
    trimmed_cost_code = str(cost_code or '').strip()
    trimmed_account_code = str(account_code or '').strip()

    if employee_category == 'Staff':
        trimmed_cost_code = trimmed_cost_code or 'FOH'
        if trimmed_cost_code == 'FOH' and not trimmed_account_code:
            trimmed_account_code = 'Staff Cost'

        try:
            normalized_account_code = normalize_account_code_for_cost_code(
                trimmed_cost_code,
                trimmed_account_code,
            )
        except ValueError as exc:
            raise ValidationError({'account_code': str(exc)}) from exc

        return (trimmed_cost_code, normalized_account_code)

    if employee_category == 'Labour':
        if trimmed_cost_code not in TIME_ALLOCATION_LABOUR_COST_CODES:
            raise ValidationError(
                {
                    'cost_code': (
                        'Select Production Labour or Installation Labour for labour employees.'
                    )
                }
            )

        if trimmed_account_code and trimmed_account_code != trimmed_cost_code:
            raise ValidationError(
                {
                    'account_code': 'Account Code must match Cost Code for labour employees.'
                }
            )

        return (trimmed_cost_code, trimmed_cost_code)

    if not trimmed_cost_code:
        raise ValidationError({'cost_code': 'Cost Code is required.'})

    try:
        normalized_account_code = normalize_account_code_for_cost_code(
            trimmed_cost_code,
            trimmed_account_code,
        )
    except ValueError as exc:
        raise ValidationError({'account_code': str(exc)}) from exc

    return (trimmed_cost_code, normalized_account_code)


def get_latest_contract_revenues(company):
    latest_revenues = []
    seen_projects = set()

    for revenue in ContractRevenue.objects.filter(company=company).order_by(
        'project_number',
        'project_name',
        '-created_at',
        '-id',
    ):
        project_key = (
            str(revenue.project_number or '').strip(),
            str(revenue.project_name or '').strip(),
        )

        if project_key in seen_projects:
            continue

        seen_projects.add(project_key)
        latest_revenues.append(revenue)

    return latest_revenues


def get_latest_tender_for_project_name(company, project_name):
    tenders = list(
        TenderLog.objects.filter(
            company=company,
            project_name=str(project_name or '').strip(),
        )
    )

    if not tenders:
        return None

    return max(
        tenders,
        key=lambda tender: (
            get_revision_sort_key(tender.revision_number or ''),
            tender.updated_at,
            tender.id,
        ),
    )


def build_contract_project_option_payload(company, revenue):
    tender = get_latest_tender_for_project_name(company, revenue.project_name)
    tender_snapshot = (
        get_tender_project_snapshot(company, tender.tender_number)
        if tender
        else None
    )

    project = {
        'id': revenue.id,
        'contract_id': revenue.id,
        'tender_number': tender.tender_number if tender else '',
        'revision_number': (
            str(tender_snapshot.get('revision_number') or '')
            if tender_snapshot
            else str(tender.revision_number or '') if tender else ''
        ),
        'project_name': revenue.project_name,
        'project_number': revenue.project_number,
        'contract_po_ref': revenue.contract_ref,
        'items': [],
        'variations': [],
    }

    for item_index, item in enumerate(tender_snapshot.get('items', []) if tender_snapshot else []):
        project['items'].append(
            {
                'id': f'{revenue.id}:base:{item_index}',
                'boq_sn': item.get('boq_sn', ''),
                'package': item.get('package', ''),
                'item_name': item.get('item_name', ''),
                'quantity': item.get('quantity', '0.00'),
                'unit': item.get('unit', ''),
                'estimated_mh': item.get('estimated_mh', '0.00'),
            }
        )

    variation_numbers = get_contract_variation_numbers_for_project(company, project)
    variation_rows_map = {
        variation_number: get_contract_variation_rows(company, project, variation_number)
        for variation_number in variation_numbers
    }
    costing_map = {
        costing.boq_item_id: costing
        for costing in TenderCosting.objects.filter(
            boq_item_id__in=[
                row.id
                for rows in variation_rows_map.values()
                for row in rows
            ]
        ).prefetch_related('labour_lines')
    }

    project['variations'] = [
        {
            'id': f'{revenue.id}:{variation_number}',
            'variation_number': variation_number,
            'items': [
                {
                    'id': row.id,
                    'boq_sn': row.sn or '',
                    'package': row.package or '',
                    'item_name': row.description,
                    'quantity': serialize_decimal(row.quantity),
                    'unit': row.unit,
                    'estimated_mh': serialize_decimal(
                        get_estimated_mh(costing_map.get(row.id))
                    ),
                }
                for row in variation_rows_map[variation_number]
            ],
        }
        for variation_number in variation_numbers
    ]

    return project


def get_contract_project_options(company):
    return [
        build_contract_project_option_payload(company, revenue)
        for revenue in get_latest_contract_revenues(company)
    ]


def ensure_admin_dashboard_access(request):
    if get_user_role(request.user) != ROLE_ADMIN:
        raise PermissionDenied('Dashboard data is only available for Admin users.')


def get_latest_original_contract_rows(company, tender_number):
    rows = list(
        BoqItem.objects.filter(
            company=company,
            tender_number=tender_number,
            variation_number='',
        )
    )

    if not rows:
        return []

    latest_revision_number = max(
        {row.revision_number or '' for row in rows},
        key=get_revision_sort_key,
    )

    return [
        row
        for row in rows
        if (row.revision_number or '') == latest_revision_number
    ]


def build_labour_costing_map(boq_rows):
    row_ids = [row.id for row in boq_rows]

    if not row_ids:
        return {}

    return {
        costing.boq_item_id: costing
        for costing in TenderCosting.objects.filter(
            boq_item_id__in=row_ids
        ).prefetch_related('labour_lines')
    }


def build_stage_hours_from_rows(boq_rows, package=''):
    package = str(package or '').strip()
    stage_totals = {
        stage: Decimal('0.00')
        for stage in MH_COMPARISON_STAGES
    }
    filtered_rows = [
        row
        for row in boq_rows
        if not package or (row.package or '') == package
    ]
    costing_map = build_labour_costing_map(filtered_rows)

    for row in filtered_rows:
        costing = costing_map.get(row.id)
        if not costing:
            continue

        for labour_line in costing.labour_lines.all():
            if labour_line.stage not in stage_totals:
                continue

            stage_totals[labour_line.stage] += Decimal(labour_line.hours or 0)

    return stage_totals


def get_project_estimated_stage_hours(company, project, package='', work_order=ALL_VARIATIONS_VALUE):
    normalized_work_order = str(work_order or '').strip() or ALL_VARIATIONS_VALUE
    estimated_stage_hours = {
        stage: Decimal('0.00')
        for stage in MH_COMPARISON_STAGES
    }

    include_base_project = normalized_work_order in {
        '',
        ALL_VARIATIONS_VALUE,
        ORIGINAL_CONTRACT_WORK_ORDER,
    }

    if include_base_project:
        for stage, hours in build_stage_hours_from_rows(
            get_latest_original_contract_rows(company, project['tender_number']),
            package=package,
        ).items():
            estimated_stage_hours[stage] += hours

    variation_numbers = []

    if normalized_work_order == ALL_VARIATIONS_VALUE:
        variation_numbers = get_contract_variation_numbers_for_project(company, project)
    elif normalized_work_order not in {'', ORIGINAL_CONTRACT_WORK_ORDER}:
        variation_numbers = [normalize_variation_number(normalized_work_order)]

    for variation_number in variation_numbers:
        for stage, hours in build_stage_hours_from_rows(
            get_contract_variation_rows(company, project, variation_number),
            package=package,
        ).items():
            estimated_stage_hours[stage] += hours

    return estimated_stage_hours


def get_project_actual_total_mh(company, project, package='', work_order=ALL_VARIATIONS_VALUE):
    normalized_work_order = str(work_order or '').strip() or ALL_VARIATIONS_VALUE
    lines = TimeAllocationLine.objects.select_related('entry').filter(
        entry__company=company,
        project_number=project['project_number'],
        project_name=project['project_name'],
    )

    if package:
        lines = lines.filter(package=package)

    if normalized_work_order == ORIGINAL_CONTRACT_WORK_ORDER:
        lines = lines.filter(variation_number='')
    elif normalized_work_order not in {'', ALL_VARIATIONS_VALUE}:
        lines = lines.filter(
            variation_number=normalize_variation_number(normalized_work_order)
        )

    lines = list(lines)

    if not lines:
        return Decimal('0.00')

    employee_ids = sorted({line.entry.employee_id for line in lines if line.entry.employee_id})
    allocation_dates = sorted({line.entry.date for line in lines if line.entry.date})

    time_entry_map = {
        (time_entry.employee.employee_id, time_entry.date): time_entry
        for time_entry in TimeEntry.objects.select_related('employee').filter(
            employee__employee_id__in=employee_ids,
            date__in=allocation_dates,
        )
    }

    total_hours = Decimal('0.00')

    for line in lines:
        time_entry = time_entry_map.get((line.entry.employee_id, line.entry.date))
        if not time_entry:
            continue

        total_hours += (
            Decimal(time_entry.total_time or 0)
            * Decimal(line.percentage or 0)
            / Decimal('100')
        )

    return total_hours.quantize(Decimal('0.01'))


def build_estimated_vs_actual_mh_payload(
    company,
    project_number='',
    project_name='',
    package='',
    work_order=ALL_VARIATIONS_VALUE,
):
    project_number = str(project_number or '').strip()
    project_name = str(project_name or '').strip()
    package = str(package or '').strip()
    work_order = str(work_order or '').strip() or ALL_VARIATIONS_VALUE

    project_options = get_contract_project_options(company)

    if project_number or project_name:
        project_options = [
            project
            for project in project_options
            if (
                (project_number and project['project_number'] == project_number)
                or (project_name and project['project_name'] == project_name)
            )
        ]

    estimated_stage_totals = {
        stage: Decimal('0.00')
        for stage in MH_COMPARISON_STAGES
    }
    actual_stage_totals = {
        stage: Decimal('0.00')
        for stage in MH_COMPARISON_STAGES
    }

    for project in project_options:
        project_estimated_stage_hours = get_project_estimated_stage_hours(
            company,
            project,
            package=package,
            work_order=work_order,
        )
        project_actual_total_mh = get_project_actual_total_mh(
            company,
            project,
            package=package,
            work_order=work_order,
        )
        project_estimated_total_mh = sum(
            project_estimated_stage_hours.values(),
            Decimal('0.00'),
        )

        for stage, hours in project_estimated_stage_hours.items():
            estimated_stage_totals[stage] += hours

        if project_actual_total_mh > 0 and project_estimated_total_mh > 0:
            for stage, estimated_hours in project_estimated_stage_hours.items():
                actual_stage_totals[stage] += (
                    project_actual_total_mh
                    * estimated_hours
                    / project_estimated_total_mh
                )

    estimated_total_mh = sum(estimated_stage_totals.values(), Decimal('0.00'))
    actual_total_mh = sum(actual_stage_totals.values(), Decimal('0.00'))

    return {
        'project_number': project_number,
        'project_name': project_name,
        'package': package,
        'work_order': work_order,
        'estimated_total_mh': serialize_decimal(estimated_total_mh),
        'actual_total_mh': serialize_decimal(actual_total_mh),
        'stages': [
            {
                'key': stage.lower(),
                'label': stage,
                'estimated_mh': serialize_decimal(estimated_stage_totals[stage]),
                'actual_mh': serialize_decimal(actual_stage_totals[stage]),
            }
            for stage in MH_COMPARISON_STAGES
        ],
    }


def get_project_for_selection(company, project_number, project_name):
    project_number = str(project_number or '').strip()
    project_name = str(project_name or '').strip()

    project = next(
        (
            option
            for option in get_contract_project_options(company)
            if option['project_number'] == project_number
            and option['project_name'] == project_name
        ),
        None,
    )

    if not project:
        raise ValidationError(
            {
                'project_number': (
                    f'Project not found for {project_number or "blank"} - '
                    f'{project_name or "blank"}.'
                )
            }
        )

    return project


def resolve_project_item_selection(
    company,
    project_number,
    project_name,
    variation_number='',
    package='',
    item_name='',
    boq_sn='',
):
    project = get_project_for_selection(company, project_number, project_name)
    variation_number = normalize_variation_number(variation_number)
    package = str(package or '').strip()
    item_name = str(item_name or '').strip()
    boq_sn = str(boq_sn or '').strip()

    if not item_name:
        raise ValidationError({'item_name': 'Item is required.'})

    if variation_number:
        if variation_number == ALL_VARIATIONS_VALUE:
            raise ValidationError(
                {'variation_number': 'Select Base Project or a specific RFV # for Delivery.'}
            )

        variation_items = get_contract_variation_rows(company, project, variation_number)

        if not variation_items:
            raise ValidationError(
                {
                    'variation_number': (
                        f'Variation {variation_number} not found for '
                        f'{project["project_number"]}.'
                    )
                }
            )

        matching_variation_items = [
            row
            for row in variation_items
            if row.description == item_name
            and (not package or (row.package or '') == package)
        ]

        if boq_sn:
            matching_variation_items = [
                row for row in matching_variation_items if (row.sn or '') == boq_sn
            ]

        if not matching_variation_items:
            raise ValidationError(
                {
                    'item_name': (
                        f'Variation item not found for {project["project_number"]} / '
                        f'{variation_number} / {item_name}.'
                    )
                }
            )

        if not boq_sn and len(matching_variation_items) > 1:
            raise ValidationError(
                {'boq_sn': 'Select BOQ SN for the selected variation item.'}
            )

        variation_item = matching_variation_items[0]

        return {
            'project': project,
            'contract': ContractRevenue.objects.get(pk=project['contract_id']),
            'project_number': project['project_number'],
            'project_name': project['project_name'],
            'variation_number': variation_number,
            'package': variation_item.package or package,
            'boq_sn': variation_item.sn or '',
            'item_name': variation_item.description,
            'total_quantity': variation_item.quantity,
            'unit': variation_item.unit,
        }

    project_items = [
        item
        for item in project.get('items', [])
        if item.get('item_name', '') == item_name
        and (not package or item.get('package', '') == package)
        and (not boq_sn or item.get('boq_sn', '') == boq_sn)
    ]

    if not project_items:
        raise ValidationError(
            {
                'item_name': (
                    f'Item not found for {project["project_number"]} / '
                    f'{item_name} / {boq_sn or "No BOQ SN"}.'
                )
            }
        )

    if not boq_sn and len(project_items) > 1:
        raise ValidationError({'boq_sn': 'Select BOQ SN for the selected item.'})

    project_item = project_items[0]

    return {
        'project': project,
        'contract': ContractRevenue.objects.get(pk=project['contract_id']),
        'project_number': project['project_number'],
        'project_name': project['project_name'],
        'variation_number': '',
        'package': project_item.get('package', ''),
        'boq_sn': project_item.get('boq_sn', ''),
        'item_name': project_item.get('item_name', ''),
        'total_quantity': Decimal(project_item.get('quantity', '0') or '0'),
        'unit': project_item.get('unit', ''),
    }


def resolve_project_package_selection(
    company,
    project_number,
    project_name,
    variation_number='',
    package='',
):
    project = get_project_for_selection(company, project_number, project_name)
    variation_number = normalize_variation_number(variation_number)
    package = str(package or '').strip()

    if variation_number:
        if variation_number == ALL_VARIATIONS_VALUE:
            if not package:
                raise ValidationError({'package': 'Package is required.'})

            base_items = list(
                item
                for item in project.get('items', [])
                if item.get('package', '') == package
            )
            variation_items = [
                row
                for row in get_all_contract_variation_rows(company, project)
                if (row.package or '') == package
            ]

            if not base_items and not variation_items:
                raise ValidationError(
                    {'package': f'Package not found for {project["project_number"]} / {package}.'}
                )

            total_quantity = (
                sum(
                    (Decimal(item.get('quantity', '0') or '0') for item in base_items),
                    Decimal('0.00'),
                )
                + sum((Decimal(item.quantity) for item in variation_items), Decimal('0.00'))
            )
            units = sorted(
                {
                    *(item.get('unit', '') for item in base_items if item.get('unit')),
                    *((item.unit or '') for item in variation_items if item.unit),
                }
            )

            return {
                'project': project,
                'contract': ContractRevenue.objects.get(pk=project['contract_id']),
                'project_number': project['project_number'],
                'project_name': project['project_name'],
                'variation_number': '',
                'package': package,
                'boq_sn': '',
                'item_name': '',
                'total_quantity': total_quantity,
                'unit': units[0] if len(units) == 1 else 'Mixed',
            }

        variation_items = get_contract_variation_rows(company, project, variation_number)

        if not variation_items:
            raise ValidationError(
                {'variation_number': 'No variation items found for the selected variation.'}
            )

        if package:
            variation_items = [
                row for row in variation_items if (row.package or '') == package
            ]

        if not variation_items:
            raise ValidationError(
                {'package': f'Package not found for {project["project_number"]} / {package}.'}
            )

        total_quantity = sum((Decimal(item.quantity) for item in variation_items), Decimal('0.00'))
        units = sorted({item.unit for item in variation_items if item.unit})

        return {
            'project': project,
            'contract': ContractRevenue.objects.get(pk=project['contract_id']),
            'project_number': project['project_number'],
            'project_name': project['project_name'],
            'variation_number': variation_number,
            'package': package,
            'boq_sn': '',
            'item_name': '',
            'total_quantity': total_quantity,
            'unit': units[0] if len(units) == 1 else 'Mixed',
        }

    if not package:
        raise ValidationError({'package': 'Package is required.'})

    project_items = [
        item
        for item in project.get('items', [])
        if item.get('package', '') == package
    ]

    if not project_items:
        raise ValidationError(
            {'package': f'Package not found for {project["project_number"]} / {package}.'}
        )

    total_quantity = sum(
        (Decimal(item.get('quantity', '0') or '0') for item in project_items),
        Decimal('0.00'),
    )
    units = sorted({item.get('unit', '') for item in project_items if item.get('unit')})

    return {
        'project': project,
        'contract': ContractRevenue.objects.get(pk=project['contract_id']),
        'project_number': project['project_number'],
        'project_name': project['project_name'],
        'variation_number': '',
        'package': package,
        'boq_sn': '',
        'item_name': '',
        'total_quantity': total_quantity,
        'unit': units[0] if len(units) == 1 else 'Mixed',
    }


def get_status_entry_filters(resolved_item):
    filters = {
        'contract': resolved_item['contract'],
    }

    if resolved_item['variation_number'] != ALL_VARIATIONS_VALUE:
        filters['variation_number'] = resolved_item['variation_number']

    if resolved_item.get('package'):
        filters['package'] = resolved_item['package']

    if resolved_item.get('boq_sn'):
        filters['boq_sn'] = resolved_item['boq_sn']

    if resolved_item.get('item_name'):
        filters['item_name'] = resolved_item['item_name']

    return filters


def get_period_start(entry_date: date, basis: str) -> date:
    if basis == 'weekly':
        return entry_date - timedelta(days=entry_date.weekday())

    if basis == 'monthly':
        return entry_date.replace(day=1)

    return entry_date


def format_period_label(period_start: date, basis: str) -> str:
    if basis == 'weekly':
        return f'Week of {period_start.strftime("%d %b %Y")}'

    if basis == 'monthly':
        return period_start.strftime('%b %Y')

    return period_start.strftime('%d %b %Y')


def get_designation_for_date(history_rows, target_date):
    for row in history_rows:
        start_date = row.salary_start_date or row.employment_start_date
        end_date = row.salary_end_date or row.employment_end_date

        if start_date <= target_date and (end_date is None or target_date <= end_date):
            return row.designation

    if history_rows:
        return history_rows[0].designation

    return 'Unassigned'


def build_designation_hours_by_period(company, resolved_item, basis, date_from=None, date_to=None):
    lines = TimeAllocationLine.objects.select_related('entry').filter(
        entry__company=company,
        project_number=resolved_item['project_number'],
        project_name=resolved_item['project_name'],
    )

    if resolved_item['variation_number'] == ALL_VARIATIONS_VALUE:
        if resolved_item['package']:
            lines = lines.filter(package=resolved_item['package'])
    elif resolved_item['variation_number']:
        lines = lines.filter(variation_number=resolved_item['variation_number'])
        if resolved_item['package']:
            lines = lines.filter(package=resolved_item['package'])
    else:
        lines = lines.filter(variation_number='')
        if resolved_item['package']:
            lines = lines.filter(package=resolved_item['package'])

    if date_from:
        lines = lines.filter(entry__date__gte=date_from)

    if date_to:
        lines = lines.filter(entry__date__lte=date_to)

    lines = list(lines.order_by('entry__date', 'entry__employee_id'))
    if not lines:
        return {}, []

    employee_ids = sorted({line.entry.employee_id for line in lines})
    allocation_dates = sorted({line.entry.date for line in lines})

    time_entry_map = {
        (time_entry.employee.employee_id, time_entry.date): time_entry
        for time_entry in TimeEntry.objects.select_related('employee').filter(
            employee__employee_id__in=employee_ids,
            date__in=allocation_dates,
        )
    }

    history_map = defaultdict(list)
    for history_row in EmployeeDetailHistory.objects.select_related('employee').filter(
        employee__employee_id__in=employee_ids,
    ).order_by('employee__employee_id', '-salary_start_date', '-created_at'):
        history_map[history_row.employee.employee_id].append(history_row)

    period_designation_hours = defaultdict(lambda: defaultdict(lambda: Decimal('0.00')))
    designation_names = set()

    for line in lines:
        time_entry = time_entry_map.get((line.entry.employee_id, line.entry.date))
        if not time_entry:
            continue

        allocated_hours = (
            Decimal(time_entry.total_time) * Decimal(line.percentage) / Decimal('100')
        ).quantize(Decimal('0.01'))

        if allocated_hours <= 0:
            continue

        designation = get_designation_for_date(
            history_map.get(line.entry.employee_id, []),
            line.entry.date,
        )
        period_start = get_period_start(line.entry.date, basis)
        period_designation_hours[period_start][designation] += allocated_hours
        designation_names.add(designation)

    return period_designation_hours, sorted(designation_names)


def get_tender_project_snapshot(company, tender_number):
    tender = TenderLog.objects.filter(company=company, tender_number=tender_number).first()

    if not tender:
        return None

    tender_revision_number = str(tender.revision_number or '').strip()

    boq_items = list(
        BoqItem.objects.filter(
            company=company,
            tender_number=tender_number,
            variation_number='',
        )
    )

    if not boq_items:
        return {
            'tender_number': tender.tender_number,
            'revision_number': tender_revision_number or 'R0',
            'project_name': tender.project_name,
            'number_of_items': 0,
            'items': [],
        }

    latest_revision_number = max(
        {
            *(item.revision_number or '' for item in boq_items),
            tender_revision_number or 'R0',
        },
        key=get_revision_sort_key,
    )
    latest_items = [
        item
        for item in boq_items
        if (item.revision_number or '') == latest_revision_number
    ]
    costings = {
        costing.boq_item_id: costing
        for costing in TenderCosting.objects.filter(
            boq_item_id__in=[item.id for item in latest_items]
        ).prefetch_related('labour_lines')
    }

    return {
        'tender_number': tender.tender_number,
        'revision_number': latest_revision_number,
        'project_name': tender.project_name,
        'number_of_items': len(latest_items),
        'items': [
            {
                'boq_sn': item.sn or '',
                'package': item.package or '',
                'item_name': item.description,
                'quantity': serialize_decimal(item.quantity),
                'unit': item.unit,
                'estimated_mh': serialize_decimal(
                    get_estimated_mh(costings.get(item.id))
                ),
            }
            for item in latest_items
        ],
    }


def get_contract_variation_numbers_for_project(company, project):
    project_number = (
        project['project_number'] if isinstance(project, dict) else project.project_number
    )
    tender_number = (
        project['tender_number'] if isinstance(project, dict) else project.tender_number
    )
    log_numbers = {
        normalize_variation_number(log.rfv_number)
        for log in ContractVariationLog.objects.filter(
            company=company,
            project_number=project_number,
        )
    }
    boq_numbers = {
        normalize_variation_number(variation_number)
        for variation_number in BoqItem.objects.filter(
            company=company,
            tender_number=tender_number,
        )
        .exclude(variation_number='')
        .values_list('variation_number', flat=True)
    }

    return sorted(
        {
            variation_number
            for variation_number in log_numbers | boq_numbers
            if variation_number
        },
        key=get_variation_sort_key,
    )


def get_contract_variation_rows(company, project, variation_number):
    normalized_variation_number = normalize_variation_number(variation_number)
    tender_number = (
        project['tender_number'] if isinstance(project, dict) else project.tender_number
    )

    if not normalized_variation_number or normalized_variation_number == ALL_VARIATIONS_VALUE:
        return []

    rows = [
        row
        for row in BoqItem.objects.filter(
            company=company,
            tender_number=tender_number,
        ).exclude(variation_number='')
        if normalize_variation_number(row.variation_number) == normalized_variation_number
    ]

    if not rows:
        return []

    latest_revision_number = max(
        {row.revision_number or '' for row in rows},
        key=get_revision_sort_key,
    )

    return [
        row
        for row in rows
        if (row.revision_number or '') == latest_revision_number
    ]


def get_all_contract_variation_rows(company, project):
    rows = []

    for variation_number in get_contract_variation_numbers_for_project(company, project):
        rows.extend(get_contract_variation_rows(company, project, variation_number))

    return rows


def build_project_option_payload(company, project):
    variation_numbers = get_contract_variation_numbers_for_project(company, project)
    variation_rows_map = {
        variation_number: get_contract_variation_rows(company, project, variation_number)
        for variation_number in variation_numbers
    }
    costing_map = {
        costing.boq_item_id: costing
        for costing in TenderCosting.objects.filter(
            boq_item_id__in=[
                row.id
                for rows in variation_rows_map.values()
                for row in rows
            ]
        ).prefetch_related('labour_lines')
    }

    return {
        'id': project.id,
        'tender_number': project.tender_number,
        'revision_number': project.revision_number,
        'project_name': project.project_name,
        'project_number': project.project_number,
        'contract_po_ref': project.contract_po_ref,
        'items': [
            {
                'id': item.id,
                'boq_sn': item.boq_sn,
                'package': item.package,
                'item_name': item.item_name,
                'quantity': serialize_decimal(item.quantity),
                'unit': item.unit,
                'estimated_mh': serialize_decimal(item.estimated_mh),
            }
            for item in project.items.all()
        ],
        'variations': [
            {
                'id': f'{project.id}:{variation_number}',
                'variation_number': variation_number,
                'items': [
                    {
                        'id': row.id,
                        'boq_sn': row.sn or '',
                        'package': row.package or '',
                        'item_name': row.description,
                        'quantity': serialize_decimal(row.quantity),
                        'unit': row.unit,
                        'estimated_mh': serialize_decimal(
                            get_estimated_mh(costing_map.get(row.id))
                        ),
                    }
                    for row in variation_rows_map[variation_number]
                ],
            }
            for variation_number in variation_numbers
        ],
    }


class ProjectOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        projects = ProjectDetail.objects.prefetch_related(
            'items',
        ).filter(company=company).order_by('project_number')
        return Response(
            [build_project_option_payload(company, project) for project in projects]
        )


class ProductionContractOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        return Response(get_contract_project_options(company))


class DashboardEstimatedVsActualMhAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        ensure_admin_dashboard_access(request)
        company = get_company_from_request(request)

        return Response(
            build_estimated_vs_actual_mh_payload(
                company=company,
                project_number=request.query_params.get('project_number', ''),
                project_name=request.query_params.get('project_name', ''),
                package=request.query_params.get('package', ''),
                work_order=request.query_params.get('work_order', ALL_VARIATIONS_VALUE),
            )
        )


class ProjectTenderOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        tender_numbers = list(
            TenderLog.objects.filter(company=company)
            .order_by('tender_number')
            .values_list('tender_number', flat=True)
        )

        return Response(
            [
                get_tender_project_snapshot(company, tender_number)
                for tender_number in tender_numbers
            ]
        )


class ProjectDetailEntryAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ProjectDetailCreateSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tender_snapshot = get_tender_project_snapshot(company, data['tender_number'])

        if tender_snapshot is None:
            raise ValidationError({'tender_number': 'Tender not found.'})

        if not tender_snapshot['items']:
            raise ValidationError(
                {'tender_number': 'No costing items found for the selected tender.'}
            )

        with transaction.atomic():
            project = ProjectDetail.objects.create(
                company=company,
                tender_number=data['tender_number'],
                revision_number=tender_snapshot['revision_number'],
                project_name=tender_snapshot['project_name'],
                project_number=data['project_number'],
                contract_po_ref=(data.get('contract_po_ref') or '').strip(),
            )

            for item in tender_snapshot['items']:
                ProjectItem.objects.create(
                    project=project,
                    boq_sn=item.get('boq_sn', ''),
                    package=item.get('package', ''),
                    item_name=item['item_name'],
                    quantity=item['quantity'],
                    unit=item['unit'],
                    estimated_mh=item['estimated_mh'],
                )

        response_serializer = ProjectDetailSerializer(project)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ProjectDetailListAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        project_number = request.query_params.get('project_number')

        projects = ProjectDetail.objects.prefetch_related(
            'items',
            'variations__items',
        ).filter(company=company)

        if project_number:
            projects = projects.filter(project_number=project_number)

        projects = projects.order_by('project_number')
        serializer = ProjectDetailSerializer(projects, many=True)
        return Response(serializer.data)


class ProjectDetailUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ProjectDetailUpdateSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        project = ProjectDetail.objects.get(
            company=company,
            project_number=data['project_number'],
        )

        with transaction.atomic():
            project.contract_po_ref = (data.get('contract_po_ref') or '').strip()
            project.save(update_fields=['contract_po_ref', 'updated_at'])

            for item_data in data['items']:
                item = ProjectItem.objects.get(id=item_data['id'], project=project)
                item.quantity = item_data['quantity']
                item.unit = item_data['unit']
                item.estimated_mh = item_data['estimated_mh']
                item.save(update_fields=['quantity', 'unit', 'estimated_mh', 'updated_at'])

        response_serializer = ProjectDetailSerializer(project)
        return Response(response_serializer.data)


class ProjectVariationAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        project_number = (request.query_params.get('project_number') or '').strip()

        variations = ProjectVariation.objects.select_related('project').prefetch_related('items').filter(
            project__company=company
        )

        if project_number:
            variations = variations.filter(project__project_number=project_number)

        serializer = ProjectVariationSerializer(variations.order_by('project__project_number', 'variation_number', 'id'), many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ProjectVariationCreateSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        project = ProjectDetail.objects.get(
            company=company,
            project_number=data['project_number'],
        )

        with transaction.atomic():
            variation = ProjectVariation.objects.create(
                project=project,
                variation_number=data['variation_number'].strip(),
            )

            for item in data['items']:
                ProjectVariationItem.objects.create(
                    variation=variation,
                    item_name=item['item_name'].strip(),
                    quantity=item['quantity'],
                    unit=item['unit'].strip(),
                    estimated_mh=item['estimated_mh'],
                )

        return Response(
            ProjectVariationSerializer(variation).data,
            status=status.HTTP_201_CREATED,
        )


class TimeAllocationEntryAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = TimeAllocationEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        cost_code, account_code = normalize_time_allocation_cost_codes(
            data['employee_id'],
            data.get('cost_code', ''),
            data.get('account_code', ''),
        )

        with transaction.atomic():
            entry = TimeAllocationEntry.objects.create(
                company=company,
                date=data['date'],
                employee_id=data['employee_id'].strip(),
                employee_name=data['employee_name'].strip(),
                cost_code=cost_code,
                account_code=account_code,
            )

            if cost_code == 'FOH':
                TimeAllocationLine.objects.create(
                    entry=entry,
                    project_number='',
                    project_name='',
                    variation_number='',
                    package='',
                    boq_sn='',
                    item_name='',
                    percentage=Decimal('100.00'),
                )
            else:
                allocations = data.get('allocations', [])
                if not allocations:
                    raise ValidationError(
                        {'allocations': 'Add at least one allocation when Cost Code is not FOH.'}
                    )

                for allocation in allocations:
                    resolved_package = resolve_project_package_selection(
                        company=company,
                        project_number=allocation['project_number'],
                        project_name=allocation['project_name'],
                        variation_number=allocation.get('variation_number', ''),
                        package=allocation.get('package', ''),
                    )

                    TimeAllocationLine.objects.create(
                        entry=entry,
                        project_number=resolved_package['project_number'],
                        project_name=resolved_package['project_name'],
                        variation_number=resolved_package['variation_number'],
                        package=resolved_package['package'],
                        boq_sn='',
                        item_name='',
                        percentage=allocation['percentage'],
                    )

        response_serializer = TimeAllocationEntrySerializer(entry)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class TimeAllocationListAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        project_number = (request.query_params.get('project_number') or '').strip()
        project_name = (request.query_params.get('project_name') or '').strip()
        variation_number = (request.query_params.get('variation_number') or '').strip()
        package = (request.query_params.get('package') or '').strip()

        lines = TimeAllocationLine.objects.select_related('entry').filter(entry__company=company)

        if project_number:
            lines = lines.filter(project_number=project_number)

        if project_name:
            lines = lines.filter(project_name=project_name)

        if variation_number:
            lines = lines.filter(variation_number=variation_number)

        if package:
            lines = lines.filter(package=package)

        serializer = TimeAllocationLineSerializer(
            lines.order_by('-entry__date', 'entry__employee_id'),
            many=True,
        )
        return Response(serializer.data)


class WorkCompletionEntryAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = WorkCompletionEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resolved_item = resolve_project_package_selection(
            company=company,
            project_number=data['project_number'],
            project_name=data['project_name'],
            variation_number=data.get('variation_number', ''),
            package=data.get('package', ''),
        )

        entry = WorkCompletionEntry.objects.create(
            contract=resolved_item['contract'],
            project=None,
            variation_number=resolved_item['variation_number'],
            date=data['date'],
            package=resolved_item['package'],
            boq_sn='',
            item_name='',
            total_quantity=resolved_item['total_quantity'],
            unit=resolved_item['unit'],
            cutting=data.get('cutting', Decimal('0.00')),
            grooving=data.get('grooving', Decimal('0.00')),
            bending=data.get('bending', Decimal('0.00')),
            fabrication=data.get('fabrication', Decimal('0.00')),
            welding=data.get('welding', Decimal('0.00')),
            finishing=data.get('finishing', Decimal('0.00')),
            coating=data.get('coating', Decimal('0.00')),
            assembly=data.get('assembly', Decimal('0.00')),
            installation=data.get('installation', Decimal('0.00')),
        )

        return Response(
            WorkCompletionEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class DeliveryEntryAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = DeliveryEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resolved_item = resolve_project_item_selection(
            company=company,
            project_number=data['project_number'],
            project_name=data['project_name'],
            variation_number=data.get('variation_number', ''),
            package=data.get('package', ''),
            item_name=data['item_name'],
            boq_sn=data.get('boq_sn', ''),
        )

        entry = DeliveryEntry.objects.create(
            contract=resolved_item['contract'],
            project=None,
            variation_number=resolved_item['variation_number'],
            date=data['date'],
            package=data.get('package', '').strip() or resolved_item.get('package', ''),
            boq_sn=resolved_item['boq_sn'],
            item_name=resolved_item['item_name'],
            total_quantity=resolved_item['total_quantity'],
            unit=resolved_item['unit'],
            delivery_note_number=data['delivery_note_number'].strip(),
            quantity=data['quantity'],
        )

        return Response(
            DeliveryEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class ProductionStatusSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        serializer = ProductionStatusSummaryRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resolved_item = resolve_project_package_selection(
            company=company,
            project_number=data['project_number'],
            project_name=data['project_name'],
            variation_number=data.get('variation_number', ''),
            package=data.get('package', ''),
        )
        status_filters = get_status_entry_filters(resolved_item)

        work_totals = WorkCompletionEntry.objects.filter(**status_filters).aggregate(
            **{stage_key: Sum(stage_key) for stage_key in WORK_COMPLETION_STAGE_KEYS}
        )
        delivery_total = (
            DeliveryEntry.objects.filter(**status_filters).aggregate(total=Sum('quantity'))['total']
            or Decimal('0.00')
        )
        total_quantity = Decimal(resolved_item['total_quantity'])

        stages = []
        for stage_key, stage_label in PRODUCTION_STAGE_FIELDS:
            raw_quantity = (
                delivery_total
                if stage_key == 'delivery'
                else work_totals.get(stage_key) or Decimal('0.00')
            )
            display_quantity = min(total_quantity, Decimal(raw_quantity))
            stages.append(
                {
                    'key': stage_key,
                    'label': stage_label,
                    'quantity': serialize_decimal(display_quantity),
                }
            )

        return Response(
            {
                'project_number': resolved_item['project_number'],
                'project_name': resolved_item['project_name'],
                'variation_number': resolved_item['variation_number'],
                'package': resolved_item['package'],
                'total_quantity': serialize_decimal(total_quantity),
                'unit': resolved_item['unit'],
                'stages': stages,
            }
        )


class ProductionStatusBreakdownAPIView(APIView):
    permission_classes = [IsAuthenticated, ApiRoleAccessPermission]

    def get(self, request):
        company = get_company_from_request(request)
        serializer = ProductionStatusBreakdownRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resolved_item = resolve_project_package_selection(
            company=company,
            project_number=data['project_number'],
            project_name=data['project_name'],
            variation_number=data.get('variation_number', ''),
            package=data.get('package', ''),
        )
        status_filters = get_status_entry_filters(resolved_item)
        stage = data['stage']
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        basis = data['basis']

        quantity_by_period = defaultdict(lambda: Decimal('0.00'))

        if stage == 'delivery':
            entries = DeliveryEntry.objects.filter(**status_filters)
            if date_from:
                entries = entries.filter(date__gte=date_from)
            if date_to:
                entries = entries.filter(date__lte=date_to)

            for entry in entries:
                period_start = get_period_start(entry.date, basis)
                quantity_by_period[period_start] += Decimal(entry.quantity)
        else:
            entries = WorkCompletionEntry.objects.filter(**status_filters)
            if date_from:
                entries = entries.filter(date__gte=date_from)
            if date_to:
                entries = entries.filter(date__lte=date_to)

            for entry in entries:
                period_start = get_period_start(entry.date, basis)
                quantity_by_period[period_start] += Decimal(getattr(entry, stage))

        designation_hours_by_period, designations = build_designation_hours_by_period(
            company=company,
            resolved_item=resolved_item,
            basis=basis,
            date_from=date_from,
            date_to=date_to,
        )

        period_starts = sorted(
            set(quantity_by_period.keys()) | set(designation_hours_by_period.keys())
        )

        periods = []
        for period_start in period_starts:
            designation_hours = designation_hours_by_period.get(period_start, {})
            periods.append(
                {
                    'period_key': period_start.isoformat(),
                    'period_label': format_period_label(period_start, basis),
                    'quantity': serialize_decimal(quantity_by_period.get(period_start)),
                    'designation_hours': {
                        designation: serialize_decimal(designation_hours.get(designation))
                        for designation in designations
                    },
                }
            )

        return Response(
            {
                'stage': stage,
                'basis': basis,
                'project_number': resolved_item['project_number'],
                'project_name': resolved_item['project_name'],
                'variation_number': resolved_item['variation_number'],
                'package': resolved_item['package'],
                'total_quantity': serialize_decimal(resolved_item['total_quantity']),
                'unit': resolved_item['unit'],
                'designations': designations,
                'hours_basis': 'allocated_item_hours',
                'periods': periods,
            }
        )
