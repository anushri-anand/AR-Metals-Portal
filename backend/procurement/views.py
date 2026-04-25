from django.utils import timezone
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.company import get_company_from_request
from shared.period_closing import ensure_request_dates_in_open_period

from .models import (
    AssetDeposit,
    BurReportSnapshot,
    DividendInvestmentEntry,
    GlPeriodClosing,
    InventoryIssuance,
    InventoryRelevantCostAllocation,
    PaymentDeliveryItem,
    PaymentEntry,
    PaymentPhase,
    PettyCashVoucher,
    PettyCashVoucherItem,
    PcrReportSnapshot,
    PurchaseOrder,
    Vendor,
)
from .serializers import (
    AssetDepositEntrySerializer,
    AssetDepositSerializer,
    BurReportSnapshotEntrySerializer,
    BurReportSnapshotSerializer,
    DividendInvestmentEntrySerializer,
    GlPeriodClosingEntrySerializer,
    GlPeriodClosingSerializer,
    InventoryIssuanceEntrySerializer,
    InventoryIssuanceSerializer,
    InventoryRelevantCostAllocationEntrySerializer,
    InventoryRelevantCostAllocationSerializer,
    PaymentEntryCreateSerializer,
    PaymentEntrySerializer,
    PaymentEntryUpdateSerializer,
    PettyCashVoucherEntrySerializer,
    PettyCashVoucherSerializer,
    PcrReportSnapshotEntrySerializer,
    PcrReportSnapshotSerializer,
    PurchaseOrderEntrySerializer,
    PurchaseOrderSerializer,
    VendorSerializer,
    parse_purchase_order_items,
)


def build_item_description(line_items):
    rows = []

    for index, item in enumerate(line_items, start=1):
        line = (
            f"{index}. {item['item']} | Qty: {item['quantity']} | Unit: {item['unit']} | "
            f"Account Code: {item.get('account_code', '')} | "
            f"Currency: {item.get('currency', 'AED')} | "
            f"Exc. Rate: {item.get('exchange_rate', 1)} | "
            f"Rate: {item['rate']} | Rate AED: {item.get('rate_aed', 0)} | "
            f"VAT %: {item.get('vat_percent', 0)} | VAT Amount: {item.get('vat', 0)} | "
            f"Amount: {item.get('amount', 0)} | Amount AED: {item.get('amount_aed', 0)}"
        )

        if item.get('depreciation_period_years'):
            line = (
                f"{line} | Depreciation Period: {item.get('depreciation_period_years')} years | "
                f"Depreciation Start: {item.get('depreciation_start_date', '')} | "
                f"Depreciation End: {item.get('depreciation_end_date', '')}"
            )

        rows.append(line)

    return '\n'.join(rows)


def serialize_line_items_for_storage(line_items):
    serialized_items = []

    for item in line_items:
        serialized_items.append(
            {
                'item': item['item'],
                'account_code': item.get('account_code', ''),
                'quantity': str(item['quantity']),
                'unit': item['unit'],
                'currency': item.get('currency', 'AED'),
                'exchange_rate': str(item.get('exchange_rate', 1)),
                'rate': str(item['rate']),
                'rate_aed': str(item.get('rate_aed', 0)),
                'vat_percent': str(item.get('vat_percent', 0)),
                'vat': str(item.get('vat', 0)),
                'amount': str(item.get('amount', 0)),
                'amount_aed': str(item.get('amount_aed', 0)),
                'depreciation_period_years': item.get('depreciation_period_years', ''),
                'depreciation_start_date': item.get('depreciation_start_date', ''),
                'depreciation_end_date': item.get('depreciation_end_date', ''),
            }
        )

    return serialized_items


class VendorEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        serializer = VendorSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response(VendorSerializer(vendor).data, status=status.HTTP_201_CREATED)


class VendorListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        vendors = Vendor.objects.filter(company=company).order_by('supplier_name')
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)


class PurchaseOrderEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = PurchaseOrderEntrySerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        existing_purchase_order = PurchaseOrder.objects.filter(
            company=company,
            po_number=data['po_number'],
        ).first()

        supplier = Vendor.objects.get(
            company=company,
            supplier_name=data['supplier_name'],
        )

        line_items = data['line_items']
        serialized_line_items = serialize_line_items_for_storage(line_items)
        order_type = data.get('order_type') or PurchaseOrder.ORDER_TYPE_PROJECT
        po_status = data.get('status') or PurchaseOrder.STATUS_DRAFT
        po_amount = sum(item.get('amount_aed', 0) for item in line_items)
        exchange_rate = 1
        vat_aed = sum(item.get('vat', 0) for item in line_items)

        po_amount_aed = po_amount
        po_amount_inc_vat_aed = po_amount_aed + vat_aed
        submitted_at = (
            timezone.now()
            if po_status == PurchaseOrder.STATUS_SUBMITTED
            else None
        )

        purchase_order_defaults = {
            'order_type': order_type,
            'status': po_status,
            'project_number': data.get('project_number', ''),
            'project_name': data.get('project_name', ''),
            'cost_code': data['cost_code'],
            'po_date_original': data['po_date_original'],
            'po_date_revised': data.get('po_date_revised'),
            'po_rev_number': data.get('po_rev_number', ''),
            'supplier': supplier,
            'item_description': build_item_description(serialized_line_items),
            'line_items': serialized_line_items,
            'currency': 'AED',
            'po_amount': po_amount,
            'exchange_rate': exchange_rate,
            'po_amount_aed': po_amount_aed,
            'vat_aed': vat_aed,
            'po_amount_inc_vat_aed': po_amount_inc_vat_aed,
            'mode_of_payment': data['mode_of_payment'],
            'remarks': data.get('remarks', ''),
        }

        if po_status == PurchaseOrder.STATUS_SUBMITTED:
            purchase_order_defaults['submitted_at'] = submitted_at
            purchase_order_defaults['approved_at'] = None

        if existing_purchase_order:
            if existing_purchase_order.status == PurchaseOrder.STATUS_APPROVED:
                raise PermissionDenied('Approved PO cannot be modified.')

            for field, value in purchase_order_defaults.items():
                setattr(existing_purchase_order, field, value)

            existing_purchase_order.save()
            purchase_order = existing_purchase_order
            response_status = status.HTTP_200_OK
        else:
            purchase_order = PurchaseOrder.objects.create(
                company=company,
                po_number=data['po_number'],
                **purchase_order_defaults,
            )
            response_status = status.HTTP_201_CREATED

        response_serializer = PurchaseOrderSerializer(
            purchase_order,
            context={'request': request, 'company': company},
        )
        return Response(response_serializer.data, status=response_status)


class PurchaseOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        order_type = request.query_params.get('order_type')
        status_value = request.query_params.get('status')
        purchase_orders = (
            PurchaseOrder.objects.select_related('supplier')
            .filter(company=company)
        )

        if order_type:
            purchase_orders = purchase_orders.filter(order_type=order_type)

        if status_value:
            purchase_orders = purchase_orders.filter(status=status_value)

        purchase_orders = purchase_orders.order_by('-po_date_original', 'po_number')
        serializer = PurchaseOrderSerializer(
            purchase_orders,
            many=True,
            context={'request': request, 'company': company},
        )
        return Response(serializer.data)


class PurchaseOrderApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin':
            raise PermissionDenied('Only admin can approve purchase orders.')

        company = get_company_from_request(request)
        purchase_order = PurchaseOrder.objects.get(pk=pk, company=company)

        if purchase_order.status != PurchaseOrder.STATUS_SUBMITTED:
            raise ValidationError({'detail': 'Only submitted purchase orders can be approved.'})

        purchase_order.status = PurchaseOrder.STATUS_APPROVED
        purchase_order.approved_at = timezone.now()
        if not purchase_order.submitted_at:
            purchase_order.submitted_at = purchase_order.approved_at
        purchase_order.save(update_fields=['status', 'approved_at', 'submitted_at'])

        return Response(
            PurchaseOrderSerializer(
                purchase_order,
                context={'request': request, 'company': company},
            ).data
        )


class PaymentEntryCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = PaymentEntryCreateSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        purchase_order = PurchaseOrder.objects.get(
            company=company,
            po_number=data['po_number'],
        )
        purchase_order_items = parse_purchase_order_items(purchase_order)
        received_quantities = {
            item['line_number']: item.get('received_quantity', 0)
            for item in data.get('delivery_items', [])
        }
        delivery_total = sum(
            item['rate'] * received_quantities.get(item['line_number'], 0)
            for item in purchase_order_items
        )

        with transaction.atomic():
            payment_entry = PaymentEntry.objects.create(
                purchase_order=purchase_order,
                advance=data.get('advance', 0),
                recovery_advance=data.get('recovery_advance', 0),
                delivery=delivery_total or data.get('delivery', 0),
                retention=data.get('retention', 0),
                release_retention=data.get('release_retention', 0),
            )

            for item in purchase_order_items:
                PaymentDeliveryItem.objects.create(
                    payment_entry=payment_entry,
                    line_number=item['line_number'],
                    item_description=item['item_description'],
                    quantity=item['quantity'],
                    unit=item['unit'],
                    rate=item['rate'],
                    received_quantity=received_quantities.get(
                        item['line_number'],
                        0,
                    ),
                )

            for index, phase in enumerate(data['phases'], start=1):
                PaymentPhase.objects.create(
                    payment_entry=payment_entry,
                    phase_number=index,
                    amount=phase['amount'],
                    due_date=phase['due_date'],
                    forecast_date=phase['forecast_date'],
                    paid=phase.get('paid_inc_vat', 0),
                    vat=phase.get('vat', 0),
                    paid_date=phase.get('paid_date'),
                    invoice_no=phase.get('invoice_no', ''),
                    invoice_date=phase.get('invoice_date'),
                    gl_no=phase.get('gl_no', ''),
                    gl_date=phase.get('gl_date'),
                )

        return Response(
            PaymentEntrySerializer(payment_entry).data,
            status=status.HTTP_201_CREATED,
        )


class PaymentEntryListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        payment_entries = (
            PaymentEntry.objects.select_related(
                'purchase_order',
                'purchase_order__supplier',
            )
            .prefetch_related('phases', 'delivery_items')
            .filter(purchase_order__company=company)
        )

        serializer = PaymentEntrySerializer(payment_entries, many=True)
        return Response(serializer.data)


class PaymentEntryUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = PaymentEntryUpdateSerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment_entry = PaymentEntry.objects.get(
            purchase_order__company=company,
            purchase_order__po_number=data['po_number']
        )

        with transaction.atomic():
            for phase_data in data['phases']:
                phase = PaymentPhase.objects.get(
                    id=phase_data['id'],
                    payment_entry=payment_entry,
                )
                phase.forecast_date = phase_data['forecast_date']
                phase.paid = phase_data['paid_inc_vat']
                phase.vat = phase_data['vat']
                phase.paid_date = phase_data.get('paid_date')
                phase.invoice_no = phase_data.get('invoice_no', '')
                phase.invoice_date = phase_data.get('invoice_date')
                phase.gl_no = phase_data.get('gl_no', '')
                phase.gl_date = phase_data.get('gl_date')
                phase.save(
                    update_fields=[
                        'forecast_date',
                        'paid',
                        'vat',
                        'paid_date',
                        'invoice_no',
                        'invoice_date',
                        'gl_no',
                        'gl_date',
                        'updated_at',
                    ]
                )

        return Response(PaymentEntrySerializer(payment_entry).data)


class InventoryIssuanceEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = InventoryIssuanceEntrySerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        issuance = InventoryIssuance.objects.create(
            purchase_order=data['purchase_order'],
            line_number=data['line_number'],
            issuance_date=data['issuance_date'],
            project_name=data['project_name'],
            project_number=data['project_number'],
            quantity_issued=data['quantity_issued'],
        )

        return Response(InventoryIssuanceSerializer(issuance).data, status=status.HTTP_201_CREATED)


class InventoryIssuanceListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        issuances = (
            InventoryIssuance.objects.select_related(
                'purchase_order',
                'purchase_order__supplier',
            )
            .filter(purchase_order__company=company)
            .order_by('issuance_date', 'id')
        )
        serializer = InventoryIssuanceSerializer(issuances, many=True)
        return Response(serializer.data)


class InventoryRelevantCostAllocationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        allocations = InventoryRelevantCostAllocation.objects.select_related(
            'inventory_purchase_order',
            'relevant_purchase_order',
        ).filter(
            inventory_purchase_order__company=company,
            relevant_purchase_order__company=company,
        )

        relevant_po_number = request.query_params.get('relevant_po_number')
        inventory_po_number = request.query_params.get('inventory_po_number')
        inventory_line_number = request.query_params.get('inventory_line_number')

        if relevant_po_number:
            allocations = allocations.filter(relevant_purchase_order__po_number=relevant_po_number)
        if inventory_po_number:
            allocations = allocations.filter(inventory_purchase_order__po_number=inventory_po_number)
        if inventory_line_number:
            allocations = allocations.filter(inventory_line_number=inventory_line_number)

        allocations = allocations.order_by(
            'relevant_purchase_order__po_number',
            'inventory_purchase_order__po_number',
            'inventory_line_number',
            'relevant_line_number',
        )
        serializer = InventoryRelevantCostAllocationSerializer(allocations, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        serializer = InventoryRelevantCostAllocationEntrySerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        InventoryRelevantCostAllocation.objects.filter(
            relevant_purchase_order=data['relevant_purchase_order'],
            inventory_purchase_order=data['inventory_purchase_order'],
            inventory_line_number=data['inventory_line_number'],
        ).delete()

        created_allocations = [
            InventoryRelevantCostAllocation.objects.create(
                relevant_purchase_order=data['relevant_purchase_order'],
                inventory_purchase_order=data['inventory_purchase_order'],
                inventory_line_number=data['inventory_line_number'],
                relevant_line_number=allocation['relevant_line_number'],
                relevant_cost_percentage=allocation['relevant_cost_percentage'],
            )
            for allocation in data['allocation_rows']
            if allocation['relevant_cost_percentage'] > 0
        ]

        response_serializer = InventoryRelevantCostAllocationSerializer(
            created_allocations,
            many=True,
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class PettyCashVoucherEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = PettyCashVoucherEntrySerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        existing_voucher = PettyCashVoucher.objects.filter(
            company=company,
            voucher_number=data['voucher_number'],
        ).first()

        with transaction.atomic():
            if existing_voucher:
                voucher = existing_voucher
                voucher.items.all().delete()
            else:
                voucher = PettyCashVoucher.objects.create(
                    company=company,
                    voucher_number=data['voucher_number'],
                )

            for index, item in enumerate(data['items'], start=1):
                PettyCashVoucherItem.objects.create(
                    voucher=voucher,
                    line_number=index,
                    item=item['item'],
                    account_code=item.get('account_code', ''),
                    project_name=item['project_name'],
                    project_number=item['project_number'],
                    cost_code=item['cost_code'],
                    quantity=item['quantity'],
                    unit=item['unit'],
                    rate=item['rate'],
                    amount_exc_vat=item['amount_exc_vat'],
                    vat_percent=item['vat_percent'],
                    vat_amount=item['vat_amount'],
                    due_amount_inc_vat=item['due_amount_inc_vat'],
                    paid_amount_inc_vat=item['paid_amount_inc_vat'],
                    invoice_number=item['invoice_number'],
                    invoice_date=item['invoice_date'],
                    supplier_name=item['supplier_name'],
                    balance=item['balance'],
                    forecast_date=item['forecast_date'],
                )

        return Response(
            PettyCashVoucherSerializer(voucher).data,
            status=status.HTTP_200_OK if existing_voucher else status.HTTP_201_CREATED,
        )


class PettyCashVoucherListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        vouchers = PettyCashVoucher.objects.prefetch_related('items').filter(company=company)
        serializer = PettyCashVoucherSerializer(vouchers, many=True)
        return Response(serializer.data)


class AssetDepositEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = AssetDepositEntrySerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        deposit = serializer.save()
        return Response(AssetDepositSerializer(deposit).data, status=status.HTTP_201_CREATED)


class AssetDepositListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        deposits = AssetDeposit.objects.filter(company=company).order_by('-expiry_date', 'serial_number')
        serializer = AssetDepositSerializer(deposits, many=True)
        return Response(serializer.data)


class DividendInvestmentEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = get_company_from_request(request)
        ensure_request_dates_in_open_period(request.data, company)
        serializer = DividendInvestmentEntrySerializer(
            data=request.data,
            context={'request': request, 'company': company},
        )
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(DividendInvestmentEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class DividendInvestmentListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        entries = DividendInvestmentEntry.objects.filter(company=company).order_by('date', 'id')
        serializer = DividendInvestmentEntrySerializer(entries, many=True)
        return Response(serializer.data)


class GlPeriodClosingAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        periods = GlPeriodClosing.objects.filter(company=company).order_by('-year', '-month', '-id')
        serializer = GlPeriodClosingSerializer(periods, many=True)
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        serializer = GlPeriodClosingEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        period, created = GlPeriodClosing.objects.get_or_create(
            company=company,
            month=data['month'],
            year=data['year'],
            defaults={
                'status': GlPeriodClosing.STATUS_SUBMITTED,
                'submitted_by': getattr(request.user, 'username', '') or '',
            },
        )

        if not created and period.status != GlPeriodClosing.STATUS_APPROVED:
            period.status = GlPeriodClosing.STATUS_SUBMITTED
            period.submitted_by = getattr(request.user, 'username', '') or ''
            period.save(update_fields=['status', 'submitted_by', 'updated_at'])

        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(GlPeriodClosingSerializer(period).data, status=response_status)


class GlPeriodClosingApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin':
            raise PermissionDenied('Only admin can approve GL period closing.')

        company = get_company_from_request(request)
        period = GlPeriodClosing.objects.get(pk=pk, company=company)
        period.status = GlPeriodClosing.STATUS_APPROVED
        period.approved_by = getattr(request.user, 'username', '') or ''
        period.approved_at = timezone.now()
        period.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        return Response(GlPeriodClosingSerializer(period).data)


class PcrReportSnapshotAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        snapshots = (
            PcrReportSnapshot.objects
            .filter(company=company)
            .order_by('-year', '-quarter', 'project_number', '-id')
        )
        serializer = PcrReportSnapshotSerializer(
            snapshots,
            many=True,
            context={'request': request, 'company': company},
        )
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        serializer = PcrReportSnapshotEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        snapshot, created = PcrReportSnapshot.objects.get_or_create(
            company=company,
            project_number=data['project_number'],
            quarter=data['quarter'],
            year=data['year'],
            defaults={
                'project_name': data['project_name'],
                'report_data': data['report_data'],
                'status': PcrReportSnapshot.STATUS_SUBMITTED,
                'submitted_by': getattr(request.user, 'username', '') or '',
                'approved_by': '',
                'approved_at': None,
            },
        )

        if not created:
            snapshot.project_name = data['project_name']
            snapshot.report_data = data['report_data']
            snapshot.status = PcrReportSnapshot.STATUS_SUBMITTED
            snapshot.submitted_by = getattr(request.user, 'username', '') or ''
            snapshot.approved_by = ''
            snapshot.approved_at = None
            snapshot.submitted_at = timezone.now()
            snapshot.save(
                update_fields=[
                    'project_name',
                    'report_data',
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
            PcrReportSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data,
            status=response_status,
        )


class PcrReportSnapshotApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin':
            raise PermissionDenied('Only admin can approve PCR snapshots.')

        company = get_company_from_request(request)
        snapshot = PcrReportSnapshot.objects.get(pk=pk, company=company)
        snapshot.status = PcrReportSnapshot.STATUS_APPROVED
        snapshot.approved_by = getattr(request.user, 'username', '') or ''
        snapshot.approved_at = timezone.now()
        snapshot.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])

        return Response(
            PcrReportSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data
        )


class BurReportSnapshotAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = get_company_from_request(request)
        snapshots = BurReportSnapshot.objects.filter(company=company).order_by(
            '-year', '-quarter', '-id'
        )
        serializer = BurReportSnapshotSerializer(
            snapshots,
            many=True,
            context={'request': request, 'company': company},
        )
        return Response(serializer.data)

    def post(self, request):
        company = get_company_from_request(request)
        serializer = BurReportSnapshotEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        snapshot, created = BurReportSnapshot.objects.get_or_create(
            company=company,
            quarter=data['quarter'],
            year=data['year'],
            defaults={
                'report_data': data['report_data'],
                'status': BurReportSnapshot.STATUS_SUBMITTED,
                'submitted_by': getattr(request.user, 'username', '') or '',
                'reviewed_by': '',
                'reviewed_at': None,
            },
        )

        if not created:
            snapshot.report_data = data['report_data']
            snapshot.status = BurReportSnapshot.STATUS_SUBMITTED
            snapshot.submitted_by = getattr(request.user, 'username', '') or ''
            snapshot.reviewed_by = ''
            snapshot.reviewed_at = None
            snapshot.submitted_at = timezone.now()
            snapshot.save(
                update_fields=[
                    'report_data',
                    'status',
                    'submitted_by',
                    'reviewed_by',
                    'reviewed_at',
                    'submitted_at',
                    'updated_at',
                ]
            )

        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(
            BurReportSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data,
            status=response_status,
        )


class BurReportSnapshotApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin':
            raise PermissionDenied('Only admin can approve BUR snapshots.')

        company = get_company_from_request(request)
        snapshot = BurReportSnapshot.objects.get(pk=pk, company=company)
        snapshot.status = BurReportSnapshot.STATUS_APPROVED
        snapshot.reviewed_by = getattr(request.user, 'username', '') or ''
        snapshot.reviewed_at = timezone.now()
        snapshot.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

        return Response(
            BurReportSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data
        )


class BurReportSnapshotRejectAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin':
            raise PermissionDenied('Only admin can reject BUR snapshots.')

        company = get_company_from_request(request)
        snapshot = BurReportSnapshot.objects.get(pk=pk, company=company)
        snapshot.status = BurReportSnapshot.STATUS_REJECTED
        snapshot.reviewed_by = getattr(request.user, 'username', '') or ''
        snapshot.reviewed_at = timezone.now()
        snapshot.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

        return Response(
            BurReportSnapshotSerializer(
                snapshot,
                context={'request': request, 'company': company},
            ).data
        )
