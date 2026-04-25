import csv
from collections import defaultdict
import io
import re
import zipfile
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from production.models import ProjectDetail
from shared.company import get_company_from_request
from shared.period_closing import ensure_request_dates_in_open_period

from .models import (
    BoqItem,
    ClientData,
    CostingRevisionSnapshot,
    ContractPaymentLog,
    ContractRevenue,
    ContractVariationLog,
    MasterListItem,
    TenderLog,
    TenderCosting,
    EstimateCostLine,
    LabourCostLine,
)
from .serializers import (
    BoqItemSerializer,
    ClientDataSerializer,
    CostingRevisionSnapshotEntrySerializer,
    CostingRevisionSnapshotSerializer,
    ContractPaymentLogSerializer,
    ContractRevenueSerializer,
    ContractVariationLogSerializer,
    MasterListItemSerializer,
    TenderLogSerializer,
    save_tender_costing,
    serialize_tender_costing,
)


COMPANY_DISPLAY_NAMES = {
    'ARM': 'Al Riyada Metal Industries LLC SP',
    'AKR': 'AKR Metal Industrial LLC',
}

BOMAL_CATEGORY_CONFIG = [
    (EstimateCostLine.MATERIAL, 'Material', True),
    (EstimateCostLine.CONSUMABLE, 'Consumables', True),
    (EstimateCostLine.COATING, 'Coating', False),
    (EstimateCostLine.MACHINING, 'Machining', False),
    (EstimateCostLine.SUBCONTRACT, 'Subcontracts', False),
]

LABOUR_ROLE_LABELS = {
    'skilled': 'Skilled',
    'semiSkilled': 'Semi-skilled',
    'helper': 'Helper',
}

LABOUR_ROLE_ORDER = {
    'Skilled': 0,
    'Semi-skilled': 1,
    'Helper': 2,
}


def get_revision_sort_key(value):
    text = str(value or '').strip()
    numbers = re.findall(r'\d+', text)

    if numbers:
        return (1, int(numbers[-1]), text)

    return (0, 0, text)


def serialize_money(value):
    return format(Decimal(value or 0).quantize(Decimal('0.01')), 'f')


def serialize_quantity(value):
    quantized = Decimal(value or 0).quantize(Decimal('0.000001'))
    text = format(quantized, 'f').rstrip('0').rstrip('.')

    return text or '0'


def serialize_percent(value):
    quantized = Decimal(value or 0).quantize(Decimal('0.01'))
    text = format(quantized, 'f').rstrip('0').rstrip('.')

    return text or '0'


def get_selected_project(company, project_number, project_name):
    project_number = str(project_number or '').strip()
    project_name = str(project_name or '').strip()

    if not project_number and not project_name:
        raise ValidationError({'project_number': 'Select a project first.'})

    projects = ProjectDetail.objects.filter(company=company)

    if project_number:
        projects = projects.filter(project_number=project_number)

    if project_name:
        projects = projects.filter(project_name=project_name)

    project = projects.first()

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


def get_bomal_context(company, tender_number='', project_number='', project_name=''):
    tender_number = str(tender_number or '').strip()
    project_number = str(project_number or '').strip()
    project_name = str(project_name or '').strip()

    tender = None

    if tender_number:
        tender = TenderLog.objects.filter(
            company=company,
            tender_number=tender_number,
        ).first()
    else:
        tender = TenderLog.objects.filter(
            company=company,
            project_name=project_name,
        ).first()

    if not tender:
        project = get_selected_project(company, project_number, project_name)
        return {
            'company': project.company,
            'project_name': project.project_name,
            'project_number': project.project_number,
            'tender_number': project.tender_number,
            'revision_number': str(project.revision_number or '').strip(),
        }

    project = (
        ProjectDetail.objects.filter(
            company=company,
            tender_number=tender.tender_number,
        )
        .order_by('-updated_at', '-id')
        .first()
    )
    revenue = (
        ContractRevenue.objects.filter(
            company=company,
            project_name=tender.project_name,
        )
        .order_by('-updated_at', '-id')
        .first()
    )
    resolved_project_number = (
        project_number
        or getattr(project, 'project_number', '')
        or getattr(revenue, 'project_number', '')
    )

    return {
        'company': company,
        'project_name': tender.project_name or project_name,
        'project_number': resolved_project_number,
        'tender_number': tender.tender_number,
        'revision_number': str(getattr(project, 'revision_number', '') or '').strip(),
    }


def get_project_boq_items(bomal_context):
    boq_items = list(
        BoqItem.objects.filter(
            company=bomal_context['company'],
            tender_number=bomal_context['tender_number'],
        )
        .select_related('costing')
        .prefetch_related('costing__estimate_lines__item', 'costing__labour_lines__item')
    )

    if not boq_items:
        return '', []

    selected_revision = str(bomal_context.get('revision_number') or '').strip()
    selected_items = [
        item
        for item in boq_items
        if str(item.revision_number or '').strip() == selected_revision
    ]

    if selected_items:
        return selected_revision, selected_items

    latest_revision = max(
        {str(item.revision_number or '').strip() for item in boq_items},
        key=get_revision_sort_key,
    )

    return latest_revision, [
        item
        for item in boq_items
        if str(item.revision_number or '').strip() == latest_revision
    ]


def build_bomal_report(bomal_context):
    revision_number, boq_items = get_project_boq_items(bomal_context)
    section_rows = {
        category: {}
        for category, _, _ in BOMAL_CATEGORY_CONFIG
    }
    labour_rows = defaultdict(
        lambda: {
            'item_description': '',
            'unit': 'Hr.',
            'estimated_qty': Decimal('0.00'),
            'qty_inc_wastage': Decimal('0.00'),
            'estimated_amount': Decimal('0.00'),
        }
    )

    for boq_item in boq_items:
        boq_quantity = Decimal(boq_item.quantity or 0)

        try:
            costing = boq_item.costing
        except TenderCosting.DoesNotExist:
            continue

        for line in costing.estimate_lines.all():
            if not line.item:
                continue

            include_wastage = line.category in {
                EstimateCostLine.MATERIAL,
                EstimateCostLine.CONSUMABLE,
            }
            estimated_qty = Decimal(line.quantity or 0) * boq_quantity
            wastage_percent = Decimal(line.wastage_percent or 0) if include_wastage else Decimal('0.00')
            qty_inc_wastage = estimated_qty

            if include_wastage:
                qty_inc_wastage += estimated_qty * wastage_percent / Decimal('100')

            rate = Decimal(line.item.rate or 0)
            amount = qty_inc_wastage * rate
            row_key = (
                line.item.item_description.strip(),
                line.item.unit.strip(),
                str(rate),
                str(wastage_percent if include_wastage else ''),
            )

            row = section_rows[line.category].setdefault(
                row_key,
                {
                    'item_description': line.item.item_description,
                    'unit': line.item.unit,
                    'wastage_percent': wastage_percent if include_wastage else None,
                    'estimated_rate': rate,
                    'estimated_qty': Decimal('0.00'),
                    'qty_inc_wastage': Decimal('0.00'),
                    'estimated_amount': Decimal('0.00'),
                    'remarks': '',
                },
            )
            row['estimated_qty'] += estimated_qty
            row['qty_inc_wastage'] += qty_inc_wastage
            row['estimated_amount'] += amount

        for line in costing.labour_lines.all():
            role_label = LABOUR_ROLE_LABELS.get(line.role, line.role.title())
            total_hours = Decimal(line.hours or 0) * boq_quantity
            rate = Decimal(line.rate or getattr(line.item, 'rate', 0) or 0)
            amount = total_hours * rate

            labour_row = labour_rows[role_label]
            labour_row['item_description'] = role_label
            labour_row['estimated_qty'] += total_hours
            labour_row['qty_inc_wastage'] += total_hours
            labour_row['estimated_amount'] += amount

    sections = []
    total_amount = Decimal('0.00')

    for category, title, include_wastage in BOMAL_CATEGORY_CONFIG:
        rows = list(section_rows[category].values())
        rows.sort(key=lambda row: row['item_description'].lower())

        if not rows:
            continue

        subtotal = sum((row['estimated_amount'] for row in rows), Decimal('0.00'))
        total_amount += subtotal
        sections.append(
            {
                'key': category,
                'title': title,
                'subtotal': serialize_money(subtotal),
                'rows': [
                    {
                        'itemDescription': row['item_description'],
                        'unit': row['unit'],
                        'estimatedQty': serialize_quantity(row['estimated_qty']),
                        'wastagePercent': (
                            serialize_percent(row['wastage_percent'])
                            if include_wastage and row['wastage_percent'] is not None
                            else ''
                        ),
                        'qtyIncWastage': serialize_quantity(row['qty_inc_wastage']),
                        'estimatedRate': serialize_money(row['estimated_rate']),
                        'estimatedAmount': serialize_money(row['estimated_amount']),
                        'remarks': row['remarks'],
                    }
                    for row in rows
                ],
            }
        )

    if labour_rows:
        labour_row_values = sorted(
            labour_rows.values(),
            key=lambda row: LABOUR_ROLE_ORDER.get(row['item_description'], 99),
        )
        labour_subtotal = sum(
            (row['estimated_amount'] for row in labour_row_values),
            Decimal('0.00'),
        )
        total_amount += labour_subtotal
        sections.append(
            {
                'key': 'labour',
                'title': 'Labour',
                'subtotal': serialize_money(labour_subtotal),
                'rows': [
                    {
                        'itemDescription': row['item_description'],
                        'unit': row['unit'],
                        'estimatedQty': serialize_quantity(row['estimated_qty']),
                        'wastagePercent': '',
                        'qtyIncWastage': serialize_quantity(row['qty_inc_wastage']),
                        'estimatedRate': serialize_money(
                            row['estimated_amount'] / row['estimated_qty']
                            if row['estimated_qty'] > 0
                            else Decimal('0.00')
                        ),
                        'estimatedAmount': serialize_money(row['estimated_amount']),
                        'remarks': '',
                    }
                    for row in labour_row_values
                ],
            }
        )

    return {
        'company': bomal_context['company'],
        'companyDisplayName': COMPANY_DISPLAY_NAMES.get(
            bomal_context['company'],
            bomal_context['company'],
        ),
        'projectName': bomal_context.get('project_name', ''),
        'projectNumber': bomal_context.get('project_number', ''),
        'tenderNumber': bomal_context['tender_number'],
        'revisionNumber': revision_number,
        'sections': sections,
        'totalAmount': serialize_money(total_amount),
    }


class ClientDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        clients = ClientData.objects.filter(company=company)
        serializer = ClientDataSerializer(clients, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ClientDataSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        client = serializer.save()
        return Response(
            ClientDataSerializer(client).data,
            status=status.HTTP_201_CREATED,
        )


class ClientDataDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        client = ClientData.objects.get(pk=pk, company=company)
        serializer = ClientDataSerializer(
            client,
            data=request.data,
            partial=True,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClientDataSerializer(client).data)


class TenderLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        tenders = TenderLog.objects.select_related('client').filter(company=company)
        serializer = TenderLogSerializer(tenders, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = TenderLogSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        tender = serializer.save()
        return Response(
            TenderLogSerializer(tender).data,
            status=status.HTTP_201_CREATED,
        )


class TenderLogDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        tender = TenderLog.objects.get(pk=pk, company=company)
        serializer = TenderLogSerializer(
            tender,
            data=request.data,
            partial=True,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TenderLogSerializer(tender).data)


class MasterListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        items = MasterListItem.objects.select_related('po_ref').filter(company=company)
        serializer = MasterListItemSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = MasterListItemSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(
            MasterListItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class MasterListDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        item = MasterListItem.objects.get(pk=pk, company=company)
        serializer = MasterListItemSerializer(
            item,
            data=request.data,
            partial=True,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MasterListItemSerializer(item).data)

    def delete(self, request, pk):
        company = get_company_from_request(request)
        MasterListItem.objects.filter(pk=pk, company=company).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContractRevenueAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        revenues = ContractRevenue.objects.prefetch_related('variations').filter(company=company)
        project_number = request.query_params.get('project_number')

        if project_number:
            revenues = revenues.filter(project_number=project_number)

        serializer = ContractRevenueSerializer(
            revenues,
            many=True,
            context={'request': request, 'company': company},
        )
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ContractRevenueSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        revenue = serializer.save()
        return Response(
            ContractRevenueSerializer(
                revenue,
                context={'request': request, 'company': company},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ContractRevenueDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        revenue = ContractRevenue.objects.get(pk=pk, company=company)
        serializer = ContractRevenueSerializer(
            revenue,
            data=request.data,
            partial=True,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            ContractRevenueSerializer(
                revenue,
                context={'request': request, 'company': company},
            ).data
        )


class ContractVariationLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        logs = ContractVariationLog.objects.filter(company=company)
        project_number = request.query_params.get('project_number')

        if project_number:
            logs = logs.filter(project_number=project_number)

        serializer = ContractVariationLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ContractVariationLogSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        variation = serializer.save()
        return Response(
            ContractVariationLogSerializer(variation).data,
            status=status.HTTP_201_CREATED,
        )


class ContractPaymentLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        logs = ContractPaymentLog.objects.filter(company=company)
        project_number = request.query_params.get('project_number')

        if project_number:
            logs = logs.filter(project_number=project_number)

        serializer = ContractPaymentLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = ContractPaymentLogSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return Response(
            ContractPaymentLogSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class BoqItemListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        items = BoqItem.objects.filter(company=company)
        serializer = BoqItemSerializer(items, many=True)
        return Response(serializer.data)


class BoqItemBulkSaveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        rows = request.data.get('rows', [])
        serializer = BoqItemSerializer(
            data=rows,
            many=True,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            submitted_ids = {
                row['id']
                for row in serializer.validated_data
                if row.get('id')
            }

            company_rows = BoqItem.objects.filter(company=company)

            if submitted_ids:
                company_rows.exclude(id__in=submitted_ids).delete()
            else:
                company_rows.delete()

            for row in serializer.validated_data:
                row_id = row.pop('id', None)
                row['company'] = company

                if row_id and BoqItem.objects.filter(id=row_id, company=company).exists():
                    BoqItem.objects.update_or_create(id=row_id, defaults=row)
                else:
                    BoqItem.objects.create(**row)

        items = BoqItem.objects.filter(company=company)
        response_serializer = BoqItemSerializer(items, many=True)
        return Response(response_serializer.data)


class BoqItemImportAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {'detail': 'Please upload an Excel or CSV file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rows = parse_boq_upload(uploaded_file)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'rows': rows})


class BoqItemDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        item = BoqItem.objects.get(pk=pk, company=company)
        serializer = BoqItemSerializer(
            item,
            data=request.data,
            partial=True,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BoqItemSerializer(item).data)


class TenderCostingListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        costings = (
            TenderCosting.objects.select_related('boq_item')
            .prefetch_related(
                'estimate_lines__item',
                'labour_lines',
            )
            .filter(boq_item__company=company)
        )
        return Response([serialize_tender_costing(costing) for costing in costings])


class TenderCostingDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, boq_item_id):
        company = get_company_from_request(request)
        try:
            costing = TenderCosting.objects.get(
                boq_item_id=boq_item_id,
                boq_item__company=company,
            )
        except TenderCosting.DoesNotExist:
            return Response(
                {'detail': 'Costing not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(serialize_tender_costing(costing))

    def post(self, request, boq_item_id):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        boq_item = BoqItem.objects.get(pk=boq_item_id, company=company)

        with transaction.atomic():
            costing = save_tender_costing(boq_item, request.data)

        return Response(serialize_tender_costing(costing))


class CostingRevisionSnapshotAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        snapshots = (
            CostingRevisionSnapshot.objects
            .filter(company=company)
            .order_by('tender_number', 'revision_number', '-submitted_at', '-id')
        )
        serializer = CostingRevisionSnapshotSerializer(
            snapshots,
            many=True,
            context={'request': request, 'company': company},
        )
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        serializer = CostingRevisionSnapshotEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        snapshot, created = CostingRevisionSnapshot.objects.get_or_create(
            company=company,
            tender_number=data['tender_number'],
            revision_number=data['revision_number'],
            defaults={
                'project_name': data['project_name'],
                'status': CostingRevisionSnapshot.STATUS_SUBMITTED,
                'submitted_by': getattr(request.user, 'username', '') or '',
                'approved_by': '',
                'approved_at': None,
            },
        )

        if not created:
            snapshot.project_name = data['project_name']
            snapshot.status = CostingRevisionSnapshot.STATUS_SUBMITTED
            snapshot.submitted_by = getattr(request.user, 'username', '') or ''
            snapshot.approved_by = ''
            snapshot.approved_at = None
            snapshot.submitted_at = timezone.now()
            snapshot.save(
                update_fields=[
                    'project_name',
                    'status',
                    'submitted_by',
                    'approved_by',
                    'approved_at',
                    'submitted_at',
                    'updated_at',
                ]
            )

        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(
            CostingRevisionSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data,
            status=response_status,
        )


class CostingRevisionSnapshotApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin':
            raise PermissionDenied('Only admin can approve costing revisions.')

        company = get_company_from_request(request)
        snapshot = CostingRevisionSnapshot.objects.get(pk=pk, company=company)
        snapshot.status = CostingRevisionSnapshot.STATUS_APPROVED
        snapshot.approved_by = getattr(request.user, 'username', '') or ''
        snapshot.approved_at = timezone.now()
        snapshot.save(
            update_fields=['status', 'approved_by', 'approved_at', 'updated_at']
        )

        return Response(
            CostingRevisionSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data
        )


class BomalReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        bomal_context = get_bomal_context(
            company,
            request.query_params.get('tender_number'),
            request.query_params.get('project_number'),
            request.query_params.get('project_name'),
        )

        return Response(build_bomal_report(bomal_context))


def parse_boq_upload(uploaded_file):
    filename = uploaded_file.name.lower()

    if filename.endswith('.csv'):
        text = uploaded_file.read().decode('utf-8-sig')
        sheet_rows = list(csv.reader(io.StringIO(text)))
    elif filename.endswith('.xlsx'):
        sheet_rows = parse_xlsx_rows(uploaded_file.read())
    else:
        raise ValueError('Upload a .xlsx or .csv file.')

    return rows_to_boq_items(sheet_rows)


def parse_xlsx_rows(content):
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise ValueError('The uploaded Excel file could not be read.') from exc

    shared_strings = get_shared_strings(archive)
    sheet_path = get_first_sheet_path(archive)

    try:
        sheet_xml = archive.read(sheet_path)
    except KeyError as exc:
        raise ValueError('The uploaded Excel file has no readable worksheet.') from exc

    root = ElementTree.fromstring(sheet_xml)
    rows = []

    for row_element in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row = []

        for cell in row_element.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            reference = cell.attrib.get('r', '')
            column_index = get_column_index(reference)

            while len(row) < column_index:
                row.append('')

            row[column_index - 1] = get_cell_value(cell, shared_strings)

        rows.append(row)

    return rows


def get_shared_strings(archive):
    try:
        shared_xml = archive.read('xl/sharedStrings.xml')
    except KeyError:
        return []

    root = ElementTree.fromstring(shared_xml)
    values = []

    for item in root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
        text_parts = [
            text_element.text or ''
            for text_element in item.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        ]
        values.append(''.join(text_parts))

    return values


def get_first_sheet_path(archive):
    try:
        workbook_root = ElementTree.fromstring(archive.read('xl/workbook.xml'))
        relationship_root = ElementTree.fromstring(
            archive.read('xl/_rels/workbook.xml.rels')
        )
    except KeyError:
        return 'xl/worksheets/sheet1.xml'

    namespace = {
        'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
        'rel': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    }
    sheet = workbook_root.find('main:sheets/main:sheet', namespace)

    if sheet is None:
        return 'xl/worksheets/sheet1.xml'

    relationship_id = sheet.attrib.get(
        '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
    )

    if not relationship_id:
        return 'xl/worksheets/sheet1.xml'

    for relationship in relationship_root:
        if relationship.attrib.get('Id') == relationship_id:
            target = relationship.attrib.get('Target', 'worksheets/sheet1.xml')
            target = target.lstrip('/')

            return target if target.startswith('xl/') else f'xl/{target}'

    return 'xl/worksheets/sheet1.xml'


def get_cell_value(cell, shared_strings):
    cell_type = cell.attrib.get('t')

    if cell_type == 'inlineStr':
        text_parts = [
            text_element.text or ''
            for text_element in cell.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        ]
        return ''.join(text_parts).strip()

    value_element = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
    value = value_element.text if value_element is not None else ''

    if cell_type == 's' and value:
        try:
            return shared_strings[int(value)].strip()
        except (IndexError, ValueError):
            return ''

    return str(value).strip()


def get_column_index(reference):
    letters = ''.join(character for character in reference if character.isalpha())

    if not letters:
        return 1

    index = 0
    for letter in letters.upper():
        index = index * 26 + ord(letter) - ord('A') + 1

    return index


def rows_to_boq_items(sheet_rows):
    header_index = find_header_index(sheet_rows)

    if header_index is None:
        raise ValueError(
            "Excel must include these columns: Client's BOQ, Item Description, Qty, Unit."
        )

    headers = [normalize_header(value) for value in sheet_rows[header_index]]
    column_map = get_column_map(headers)
    rows = []

    for raw_row in sheet_rows[header_index + 1:]:
        if not any(str(value).strip() for value in raw_row):
            continue

        rows.append(
            {
                'sn': get_row_value(raw_row, column_map.get('sn', -1)) or str(len(rows) + 1),
                'tenderNumber': '',
                'revisionNumber': '',
                'clientsBoq': get_row_value(raw_row, column_map['clientsBoq']),
                'package': get_row_value(raw_row, column_map.get('package', -1)),
                'description': get_row_value(raw_row, column_map['itemDescription']),
                'quantity': parse_number(get_row_value(raw_row, column_map['quantity'])),
                'unit': get_row_value(raw_row, column_map['unit']),
            }
        )

    if not rows:
        raise ValueError('No BOQ item rows were found in the uploaded file.')

    return rows


def find_header_index(sheet_rows):
    for index, row in enumerate(sheet_rows):
        headers = [normalize_header(value) for value in row]
        column_map = get_column_map(headers, require_all=False)

        if len(column_map) >= 3 and 'itemDescription' in column_map and 'quantity' in column_map:
            missing_fields = set(required_boq_fields()) - set(column_map)

            if missing_fields:
                raise ValueError(
                    "Excel must include these columns: Client's BOQ, Item Description, Qty, Unit."
                )

            return index

    return None


def get_column_map(headers, require_all=True):
    aliases = {
        'sn': {'sn', 'sno', 'serialno', 'serialnumber'},
        'clientsBoq': {'clientsboq', 'clientboq', 'boq', 'clientboqref'},
        'package': {'package', 'pkg'},
        'itemDescription': {'itemdescription', 'description', 'desc'},
        'quantity': {'qty', 'quantity'},
        'unit': {'unit', 'uom'},
    }
    column_map = {}

    for field, field_aliases in aliases.items():
        for index, header in enumerate(headers):
            if header in field_aliases:
                column_map[field] = index
                break

    if require_all:
        missing_fields = set(required_boq_fields()) - set(column_map)

        if missing_fields:
            raise ValueError(
                "Excel must include these columns: Client's BOQ, Item Description, Qty, Unit."
            )

    return column_map


def required_boq_fields():
    return ['clientsBoq', 'itemDescription', 'quantity', 'unit']


def normalize_header(value):
    return re.sub(r'[^a-z0-9]', '', str(value).strip().lower())


def get_row_value(row, index):
    if index < 0 or index >= len(row):
        return ''

    return str(row[index]).strip()


def parse_number(value):
    if not value:
        return 0

    cleaned_value = str(value).replace(',', '').strip()

    try:
        return float(Decimal(cleaned_value))
    except (InvalidOperation, ValueError):
        return 0
