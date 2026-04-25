import re
from decimal import Decimal, InvalidOperation

from django.db import models
from rest_framework import serializers

from shared.account_codes import normalize_account_code_for_cost_code
from shared.company import CurrentCompanyDefault

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


def parse_purchase_order_items(purchase_order):
    if purchase_order.line_items:
        rows = []

        for line_number, item in enumerate(purchase_order.line_items, start=1):
            values = get_purchase_order_item_values(item, purchase_order.exchange_rate)

            rows.append(
                {
                    'line_number': line_number,
                    'item_description': (item.get('item') or '').strip(),
                    'account_code': (item.get('account_code') or '').strip(),
                    'quantity': values['quantity'],
                    'unit': item.get('unit') or '',
                    'currency': item.get('currency') or 'AED',
                    'exchange_rate': values['exchange_rate'],
                    'source_rate': values['source_rate'],
                    'rate': values['rate_aed'],
                    'rate_aed': values['rate_aed'],
                    'vat_percent': get_decimal_value(item.get('vat_percent')),
                    'vat': values['vat_aed'],
                    'source_amount': values['source_amount'],
                    'amount': values['amount_aed'],
                    'amount_aed': values['amount_aed'],
                    'depreciation_period_years': item.get('depreciation_period_years', ''),
                    'depreciation_start_date': item.get('depreciation_start_date', ''),
                    'depreciation_end_date': item.get('depreciation_end_date', ''),
                }
            )

        return rows

    rows = []

    for line_number, raw_line in enumerate(
        purchase_order.item_description.splitlines(),
        start=1,
    ):
        line = raw_line.strip()

        if not line:
            continue

        parsed_item = parse_purchase_order_item_line(line, line_number)
        values = get_purchase_order_item_values(parsed_item, purchase_order.exchange_rate)

        rows.append(
            {
                **parsed_item,
                'exchange_rate': values['exchange_rate'],
                'source_rate': values['source_rate'],
                'rate': values['rate_aed'],
                'rate_aed': values['rate_aed'],
                'source_amount': values['source_amount'],
                'amount': values['amount_aed'],
                'amount_aed': values['amount_aed'],
                'vat': values['vat_aed'],
            }
        )

    return rows


def parse_purchase_order_item_line(line, line_number):
    item_description = re.sub(r'^\d+\.\s*', '', line).split('|', maxsplit=1)[0].strip()
    vat_amount = get_line_decimal(line, r'VAT Amount:\s*([^|]+)') or get_line_decimal(
        line,
        r'VAT:\s*([^|]+)',
    )

    return {
        'line_number': line_number,
        'item_description': item_description or line,
        'account_code': get_line_text(line, r'Account Code:\s*([^|]+)'),
        'quantity': get_line_decimal(line, r'Qty:\s*([^|]+)'),
        'unit': get_line_text(line, r'Unit:\s*([^|]+)'),
        'currency': get_line_text(line, r'Currency:\s*([^|]+)') or 'AED',
        'exchange_rate': get_line_decimal(line, r'Exc\. Rate:\s*([^|]+)'),
        'source_rate': get_line_decimal(line, r'Rate:\s*([^|]+)'),
        'rate': get_line_decimal(line, r'Rate:\s*([^|]+)'),
        'vat_percent': get_line_decimal(line, r'VAT %:\s*([^|]+)'),
        'vat': vat_amount,
        'source_amount': get_line_decimal(line, r'Amount:\s*([^|]+)'),
        'amount': get_line_decimal(line, r'Amount:\s*([^|]+)'),
    }


def get_line_text(line, pattern):
    match = re.search(pattern, line, re.IGNORECASE)
    return match.group(1).strip() if match else ''


def get_line_decimal(line, pattern):
    value = get_line_text(line, pattern)

    try:
        return Decimal(value.replace(',', '')) if value else Decimal('0.00')
    except (InvalidOperation, AttributeError):
        return Decimal('0.00')


def get_decimal_value(value):
    try:
        return Decimal(str(value or '0').replace(',', ''))
    except (InvalidOperation, AttributeError):
        return Decimal('0.00')


def get_purchase_order_item_values(item, fallback_exchange_rate=Decimal('1.00')):
    quantity = get_decimal_value(item.get('quantity'))
    source_rate = get_decimal_value(item.get('rate'))
    exchange_rate = get_decimal_value(item.get('exchange_rate')) or get_decimal_value(
        fallback_exchange_rate
    ) or Decimal('1.00')
    source_amount = get_decimal_value(item.get('amount')) or (quantity * source_rate)
    rate_aed = get_decimal_value(item.get('rate_aed')) or (source_rate * exchange_rate)
    amount_aed = get_decimal_value(item.get('amount_aed')) or (source_amount * exchange_rate)
    vat_percent = get_decimal_value(item.get('vat_percent'))
    vat_aed = get_decimal_value(item.get('vat')) or (
        amount_aed * vat_percent / Decimal('100')
    )

    return {
        'quantity': quantity,
        'source_rate': source_rate,
        'exchange_rate': exchange_rate,
        'source_amount': source_amount,
        'rate_aed': rate_aed.quantize(Decimal('0.01')),
        'amount_aed': amount_aed.quantize(Decimal('0.01')),
        'vat_aed': vat_aed.quantize(Decimal('0.01')),
    }


def get_purchase_order_item_by_line_number(purchase_order, line_number):
    return next(
        (
            item
            for item in parse_purchase_order_items(purchase_order)
            if item['line_number'] == line_number
        ),
        None,
    )


class PurchaseOrderLineItemSerializer(serializers.Serializer):
    item = serializers.CharField(max_length=255)
    account_code = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    quantity = serializers.DecimalField(max_digits=14, decimal_places=6)
    unit = serializers.CharField(max_length=50)
    currency = serializers.CharField(max_length=50)
    exchange_rate = serializers.DecimalField(max_digits=14, decimal_places=4)
    rate = serializers.DecimalField(max_digits=14, decimal_places=2)
    rate_aed = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    vat_percent = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    vat = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    amount_aed = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    depreciation_period_years = serializers.CharField(required=False, allow_blank=True)
    depreciation_start_date = serializers.CharField(required=False, allow_blank=True)
    depreciation_end_date = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        quantity = attrs.get('quantity') or Decimal('0.00')
        exchange_rate = attrs.get('exchange_rate') or Decimal('0.00')
        source_rate = attrs.get('rate') or Decimal('0.00')
        vat_percent = attrs.get('vat_percent') or Decimal('0.00')

        if quantity <= 0:
            raise serializers.ValidationError({'quantity': 'Quantity must be greater than 0.'})

        if exchange_rate <= 0:
            raise serializers.ValidationError(
                {'exchange_rate': 'Exchange rate must be greater than 0.'}
            )

        if source_rate < 0:
            raise serializers.ValidationError({'rate': 'Unit Price cannot be negative.'})

        if vat_percent < 0:
            raise serializers.ValidationError({'vat_percent': 'VAT % cannot be negative.'})

        source_amount = quantity * source_rate
        rate_aed = source_rate * exchange_rate
        amount_aed = source_amount * exchange_rate
        vat_aed = amount_aed * vat_percent / Decimal('100')

        attrs['currency'] = (attrs.get('currency') or '').strip()
        attrs['account_code'] = (attrs.get('account_code') or '').strip()
        attrs['amount'] = source_amount.quantize(Decimal('0.01'))
        attrs['rate_aed'] = rate_aed.quantize(Decimal('0.01'))
        attrs['amount_aed'] = amount_aed.quantize(Decimal('0.01'))
        attrs['vat'] = vat_aed.quantize(Decimal('0.01'))
        return attrs


class VendorSerializer(serializers.ModelSerializer):
    company = serializers.HiddenField(default=CurrentCompanyDefault())

    class Meta:
        model = Vendor
        fields = [
            'id',
            'company',
            'supplier_name',
            'country',
            'city',
            'contact_person_name',
            'mobile_number',
            'company_telephone',
            'product_details',
            'review',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    supplier_contact_person_name = serializers.CharField(
        source='supplier.contact_person_name',
        read_only=True,
    )
    supplier_mobile_number = serializers.CharField(
        source='supplier.mobile_number',
        read_only=True,
    )
    supplier_company_telephone = serializers.CharField(
        source='supplier.company_telephone',
        read_only=True,
    )
    supplier_country = serializers.CharField(source='supplier.country', read_only=True)
    supplier_city = serializers.CharField(source='supplier.city', read_only=True)
    purchase_items = serializers.SerializerMethodField()
    pdf_filename = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'order_type',
            'status',
            'po_number',
            'project_number',
            'project_name',
            'cost_code',
            'po_date_original',
            'po_date_revised',
            'po_rev_number',
            'supplier',
            'supplier_name',
            'supplier_contact_person_name',
            'supplier_mobile_number',
            'supplier_company_telephone',
            'supplier_country',
            'supplier_city',
            'item_description',
            'line_items',
            'currency',
            'po_amount',
            'exchange_rate',
            'po_amount_aed',
            'vat_aed',
            'po_amount_inc_vat_aed',
            'mode_of_payment',
            'remarks',
            'purchase_items',
            'pdf_filename',
            'submitted_at',
            'approved_at',
            'created_at',
        ]
        read_only_fields = ['id', 'supplier_name', 'purchase_items', 'created_at']

    def get_purchase_items(self, obj):
        return parse_purchase_order_items(obj)

    def get_pdf_filename(self, obj):
        return f'{obj.po_number}.pdf'


class PurchaseOrderEntrySerializer(serializers.Serializer):
    po_number = serializers.CharField(max_length=100)
    order_type = serializers.ChoiceField(
        choices=PurchaseOrder.ORDER_TYPE_CHOICES,
        required=False,
    )
    status = serializers.ChoiceField(
        choices=PurchaseOrder.STATUS_CHOICES,
        required=False,
    )
    project_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    project_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cost_code = serializers.ChoiceField(choices=PurchaseOrder.COST_CODE_CHOICES)

    po_date_original = serializers.DateField()
    po_date_revised = serializers.DateField(required=False, allow_null=True)
    po_rev_number = serializers.CharField(required=False, allow_blank=True)

    supplier_name = serializers.CharField(max_length=255)

    line_items = PurchaseOrderLineItemSerializer(many=True)
    item_description = serializers.CharField(required=False, allow_blank=True)
    vat_aed = serializers.DecimalField(max_digits=14, decimal_places=2)

    mode_of_payment = serializers.ChoiceField(choices=PurchaseOrder.MODE_OF_PAYMENT_CHOICES)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_po_number(self, value):
        value = value.strip()
        company = self.context.get('company')
        existing = (
            PurchaseOrder.objects.filter(company=company, po_number=value).first()
            if company
            else None
        )

        if existing and existing.status == PurchaseOrder.STATUS_APPROVED:
            raise serializers.ValidationError('Approved PO cannot be modified.')
        return value

    def validate_supplier_name(self, value):
        value = value.strip()
        company = self.context.get('company')

        vendor = (
            Vendor.objects.filter(company=company, supplier_name__iexact=value).first()
            if company
            else None
        )

        if company and not vendor:
            raise serializers.ValidationError('Supplier not found in Vendor Data.')
        return vendor.supplier_name if vendor else value

    def validate(self, attrs):
        order_type = attrs.get('order_type') or PurchaseOrder.ORDER_TYPE_PROJECT
        project_number = (attrs.get('project_number') or '').strip()
        project_name = (attrs.get('project_name') or '').strip()
        cost_code = attrs.get('cost_code')

        if order_type != PurchaseOrder.ORDER_TYPE_INVENTORY:
            errors = {}

            if not project_number:
                errors['project_number'] = 'Project # is required.'

            if not project_name:
                errors['project_name'] = 'Project Name is required.'

            if errors:
                raise serializers.ValidationError(errors)

        try:
            for item in attrs.get('line_items', []):
                item['account_code'] = normalize_account_code_for_cost_code(
                    cost_code,
                    item.get('account_code'),
                )
        except ValueError as exc:
            raise serializers.ValidationError({'line_items': str(exc)})

        attrs['project_number'] = project_number
        attrs['project_name'] = project_name
        attrs['po_rev_number'] = (attrs.get('po_rev_number') or '').strip()
        attrs['remarks'] = (attrs.get('remarks') or '').strip()
        return attrs


class PaymentDeliveryItemSerializer(serializers.ModelSerializer):
    actual_incurred_cost = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = PaymentDeliveryItem
        fields = [
            'id',
            'line_number',
            'item_description',
            'quantity',
            'unit',
            'rate',
            'received_quantity',
            'actual_incurred_cost',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'actual_incurred_cost', 'created_at', 'updated_at']


class PaymentPhaseSerializer(serializers.ModelSerializer):
    paid_inc_vat = serializers.DecimalField(
        source='paid',
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    paid_exc_vat = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = PaymentPhase
        fields = [
            'id',
            'phase_number',
            'amount',
            'due_date',
            'forecast_date',
            'paid_inc_vat',
            'vat',
            'paid_exc_vat',
            'paid_date',
            'invoice_no',
            'invoice_date',
            'gl_no',
            'gl_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'phase_number', 'created_at', 'updated_at']


class PaymentEntrySerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    project_number = serializers.CharField(source='purchase_order.project_number', read_only=True)
    project_name = serializers.CharField(source='purchase_order.project_name', read_only=True)
    po_amount = serializers.DecimalField(
        source='purchase_order.po_amount',
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    supplier_name = serializers.CharField(
        source='purchase_order.supplier.supplier_name',
        read_only=True,
    )
    phases = PaymentPhaseSerializer(many=True, read_only=True)
    delivery_items = PaymentDeliveryItemSerializer(many=True, read_only=True)
    net_payable_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    payment_status = serializers.SerializerMethodField()

    def get_payment_status(self, obj):
        return 'Closed' if obj.purchase_order.po_amount == obj.delivery else 'Open'

    class Meta:
        model = PaymentEntry
        fields = [
            'id',
            'purchase_order',
            'po_number',
            'project_number',
            'project_name',
            'po_amount',
            'supplier_name',
            'advance',
            'recovery_advance',
            'delivery',
            'retention',
            'release_retention',
            'net_payable_amount',
            'payment_status',
            'delivery_items',
            'phases',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'po_number',
            'project_number',
            'project_name',
            'po_amount',
            'supplier_name',
            'net_payable_amount',
            'payment_status',
            'delivery_items',
            'phases',
            'created_at',
            'updated_at',
        ]


class PaymentDeliveryItemCreateSerializer(serializers.Serializer):
    line_number = serializers.IntegerField(min_value=1)
    received_quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=6,
        required=False,
        default='0.00',
    )


class PaymentPhaseCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    due_date = serializers.DateField()
    forecast_date = serializers.DateField(required=False, allow_null=True)
    paid_inc_vat = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    vat = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    invoice_no = serializers.CharField(required=False, allow_blank=True)
    invoice_date = serializers.DateField(required=False, allow_null=True)
    gl_no = serializers.CharField(required=False, allow_blank=True)
    gl_date = serializers.DateField(required=False, allow_null=True)
    paid_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get('forecast_date'):
            attrs['forecast_date'] = attrs['due_date']
        return attrs


class PaymentEntryCreateSerializer(serializers.Serializer):
    po_number = serializers.CharField(max_length=100)
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
    delivery_items = PaymentDeliveryItemCreateSerializer(many=True, required=False)
    phases = PaymentPhaseCreateSerializer(many=True)

    def validate_po_number(self, value):
        company = self.context.get('company')

        if company and not PurchaseOrder.objects.filter(company=company, po_number=value).exists():
            raise serializers.ValidationError('PO not found.')

        if company and PaymentEntry.objects.filter(
            purchase_order__company=company,
            purchase_order__po_number=value,
        ).exists():
            raise serializers.ValidationError('Payment entry already exists for this PO.')

        return value

    def validate(self, attrs):
        purchase_order = PurchaseOrder.objects.get(
            company=self.context.get('company'),
            po_number=attrs['po_number'],
        )
        valid_line_numbers = {
            item['line_number']
            for item in parse_purchase_order_items(purchase_order)
        }
        submitted_line_numbers = {
            item['line_number']
            for item in attrs.get('delivery_items', [])
        }

        invalid_line_numbers = submitted_line_numbers - valid_line_numbers
        if invalid_line_numbers:
            raise serializers.ValidationError(
                {'delivery_items': 'One or more delivery items do not belong to the selected PO.'}
            )

        return attrs


class PaymentPhaseUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    forecast_date = serializers.DateField()
    paid_inc_vat = serializers.DecimalField(max_digits=14, decimal_places=2)
    vat = serializers.DecimalField(max_digits=14, decimal_places=2)
    paid_date = serializers.DateField(required=False, allow_null=True)
    invoice_no = serializers.CharField(required=False, allow_blank=True)
    invoice_date = serializers.DateField(required=False, allow_null=True)
    gl_no = serializers.CharField(required=False, allow_blank=True)
    gl_date = serializers.DateField(required=False, allow_null=True)


class PaymentEntryUpdateSerializer(serializers.Serializer):
    po_number = serializers.CharField(max_length=100)
    phases = PaymentPhaseUpdateSerializer(many=True)

    def validate_po_number(self, value):
        if not PaymentEntry.objects.filter(purchase_order__po_number=value).exists():
            raise serializers.ValidationError('Payment entry not found.')
        return value

    def validate(self, attrs):
        payment_entry = PaymentEntry.objects.get(
            purchase_order__po_number=attrs['po_number']
        )

        existing_phase_ids = set(payment_entry.phases.values_list('id', flat=True))
        submitted_phase_ids = {phase['id'] for phase in attrs.get('phases', [])}

        invalid_phase_ids = submitted_phase_ids - existing_phase_ids
        if invalid_phase_ids:
            raise serializers.ValidationError(
                {'phases': 'One or more phases do not belong to the selected PO.'}
            )

        return attrs


class InventoryIssuanceSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    supplier_name = serializers.CharField(
        source='purchase_order.supplier.supplier_name',
        read_only=True,
    )
    cost_code = serializers.CharField(source='purchase_order.cost_code', read_only=True)
    item_description = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    total_procured_quantity = serializers.SerializerMethodField()
    rate = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = InventoryIssuance
        fields = [
            'id',
            'po_number',
            'supplier_name',
            'issuance_date',
            'project_name',
            'project_number',
            'cost_code',
            'line_number',
            'item_description',
            'unit',
            'total_procured_quantity',
            'quantity_issued',
            'rate',
            'amount',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def _get_line_item(self, obj):
        return get_purchase_order_item_by_line_number(obj.purchase_order, obj.line_number) or {}

    def get_item_description(self, obj):
        return self._get_line_item(obj).get('item_description', '')

    def get_unit(self, obj):
        return self._get_line_item(obj).get('unit', '')

    def get_total_procured_quantity(self, obj):
        return self._get_line_item(obj).get('quantity', Decimal('0.00'))

    def get_rate(self, obj):
        return self._get_line_item(obj).get('rate', Decimal('0.00'))

    def get_amount(self, obj):
        line_item = self._get_line_item(obj)
        return (line_item.get('rate', Decimal('0.00')) or Decimal('0.00')) * obj.quantity_issued


class InventoryIssuanceEntrySerializer(serializers.Serializer):
    po_number = serializers.CharField(max_length=100)
    line_number = serializers.IntegerField(min_value=1)
    issuance_date = serializers.DateField()
    project_name = serializers.CharField(max_length=255)
    project_number = serializers.CharField(max_length=100)
    quantity_issued = serializers.DecimalField(max_digits=14, decimal_places=6)

    def validate_po_number(self, value):
        company = self.context.get('company')
        purchase_order = (
            PurchaseOrder.objects.filter(company=company, po_number=value).first()
            if company
            else None
        )

        if not purchase_order:
            raise serializers.ValidationError('PO not found.')

        if purchase_order.order_type != PurchaseOrder.ORDER_TYPE_INVENTORY:
            raise serializers.ValidationError('Selected PO is not an inventory purchase order.')

        if purchase_order.status != PurchaseOrder.STATUS_APPROVED:
            raise serializers.ValidationError('Only approved inventory POs can be issued.')

        return value

    def validate(self, attrs):
        company = self.context.get('company')
        purchase_order = PurchaseOrder.objects.get(company=company, po_number=attrs['po_number'])
        line_item = get_purchase_order_item_by_line_number(
            purchase_order,
            attrs['line_number'],
        )

        if not line_item:
            raise serializers.ValidationError({'line_number': 'Item not found in the selected PO.'})

        quantity_issued = attrs.get('quantity_issued') or Decimal('0.00')
        if quantity_issued <= 0:
            raise serializers.ValidationError(
                {'quantity_issued': 'Quantity to Issue must be greater than 0.'}
            )

        total_procured = line_item.get('quantity') or Decimal('0.00')
        quantity_already_issued = (
            InventoryIssuance.objects.filter(
                purchase_order=purchase_order,
                line_number=attrs['line_number'],
            ).aggregate(total=models.Sum('quantity_issued'))['total']
            or Decimal('0.00')
        )

        if quantity_already_issued + quantity_issued > total_procured:
            raise serializers.ValidationError(
                {
                    'quantity_issued': (
                        'Quantity to Issue cannot exceed the remaining quantity.'
                    )
                }
            )

        attrs['purchase_order'] = purchase_order
        return attrs


class InventoryRelevantCostAllocationSerializer(serializers.ModelSerializer):
    relevant_po_number = serializers.CharField(
        source='relevant_purchase_order.po_number',
        read_only=True,
    )
    inventory_po_number = serializers.CharField(
        source='inventory_purchase_order.po_number',
        read_only=True,
    )
    relevant_item_description = serializers.SerializerMethodField()
    inventory_item_description = serializers.SerializerMethodField()

    class Meta:
        model = InventoryRelevantCostAllocation
        fields = [
            'id',
            'relevant_po_number',
            'relevant_line_number',
            'relevant_item_description',
            'inventory_po_number',
            'inventory_line_number',
            'inventory_item_description',
            'relevant_cost_percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_relevant_item_description(self, obj):
        line_item = get_purchase_order_item_by_line_number(
            obj.relevant_purchase_order,
            obj.relevant_line_number,
        ) or {}
        return line_item.get('item_description', '')

    def get_inventory_item_description(self, obj):
        line_item = get_purchase_order_item_by_line_number(
            obj.inventory_purchase_order,
            obj.inventory_line_number,
        ) or {}
        return line_item.get('item_description', '')


class InventoryRelevantCostAllocationEntrySerializer(serializers.Serializer):
    relevant_po_number = serializers.CharField(max_length=100)
    inventory_po_number = serializers.CharField(max_length=100)
    inventory_line_number = serializers.IntegerField(min_value=1)
    allocations = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True,
    )

    def validate(self, attrs):
        company = self.context.get('company')
        relevant_po = PurchaseOrder.objects.filter(
            company=company,
            po_number=attrs['relevant_po_number'],
        ).first()
        if not relevant_po:
            raise serializers.ValidationError({'relevant_po_number': 'Relevant PO not found.'})
        if relevant_po.order_type != PurchaseOrder.ORDER_TYPE_PROJECT:
            raise serializers.ValidationError(
                {'relevant_po_number': 'Relevant PO must be a project purchase order.'}
            )

        inventory_po = PurchaseOrder.objects.filter(
            company=company,
            po_number=attrs['inventory_po_number'],
        ).first()
        if not inventory_po:
            raise serializers.ValidationError({'inventory_po_number': 'Inventory PO not found.'})
        if inventory_po.order_type != PurchaseOrder.ORDER_TYPE_INVENTORY:
            raise serializers.ValidationError(
                {'inventory_po_number': 'Selected PO must be an inventory purchase order.'}
            )

        inventory_item = get_purchase_order_item_by_line_number(
            inventory_po,
            attrs['inventory_line_number'],
        )
        if not inventory_item:
            raise serializers.ValidationError(
                {'inventory_line_number': 'Selected inventory item was not found.'}
            )

        allocation_rows = []
        total_percentage = Decimal('0.00')
        seen_line_numbers = set()

        for index, allocation in enumerate(attrs.get('allocations', []), start=1):
            relevant_line_number = int(allocation.get('relevant_line_number') or 0)
            relevant_item = get_purchase_order_item_by_line_number(relevant_po, relevant_line_number)
            if not relevant_item:
                raise serializers.ValidationError(
                    {'allocations': f'Row {index}: selected relevant PO item was not found.'}
                )

            if relevant_line_number in seen_line_numbers:
                raise serializers.ValidationError(
                    {'allocations': f'Row {index}: duplicate relevant PO item selected.'}
                )

            seen_line_numbers.add(relevant_line_number)
            relevant_cost_percentage = get_decimal_value(allocation.get('relevant_cost_percentage'))

            if relevant_cost_percentage < 0:
                raise serializers.ValidationError(
                    {'allocations': f'Row {index}: Relevant Cost % cannot be negative.'}
                )

            total_percentage += relevant_cost_percentage
            allocation_rows.append(
                {
                    'relevant_line_number': relevant_line_number,
                    'relevant_cost_percentage': relevant_cost_percentage.quantize(Decimal('0.01')),
                }
            )

        if total_percentage > Decimal('100.00'):
            raise serializers.ValidationError(
                {'allocations': 'Total Relevant Cost % cannot exceed 100.'}
            )

        attrs['relevant_purchase_order'] = relevant_po
        attrs['inventory_purchase_order'] = inventory_po
        attrs['allocation_rows'] = allocation_rows
        return attrs


class PettyCashVoucherItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PettyCashVoucherItem
        fields = [
            'id',
            'line_number',
            'item',
            'account_code',
            'project_name',
            'project_number',
            'cost_code',
            'quantity',
            'unit',
            'rate',
            'amount_exc_vat',
            'vat_percent',
            'vat_amount',
            'due_amount_inc_vat',
            'paid_amount_inc_vat',
            'invoice_number',
            'invoice_date',
            'supplier_name',
            'balance',
            'forecast_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'line_number', 'created_at', 'updated_at']


class PettyCashVoucherSerializer(serializers.ModelSerializer):
    items = PettyCashVoucherItemSerializer(many=True, read_only=True)

    class Meta:
        model = PettyCashVoucher
        fields = [
            'id',
            'company',
            'voucher_number',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class PettyCashVoucherItemEntrySerializer(serializers.Serializer):
    item = serializers.CharField(max_length=255)
    account_code = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    project_name = serializers.CharField(max_length=255)
    project_number = serializers.CharField(max_length=100)
    cost_code = serializers.ChoiceField(choices=PurchaseOrder.COST_CODE_CHOICES)
    quantity = serializers.DecimalField(max_digits=14, decimal_places=6)
    unit = serializers.CharField(max_length=50)
    rate = serializers.DecimalField(max_digits=14, decimal_places=2)
    amount_exc_vat = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
    )
    vat_percent = serializers.DecimalField(max_digits=8, decimal_places=2)
    vat_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
    )
    due_amount_inc_vat = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
    )
    paid_amount_inc_vat = serializers.DecimalField(max_digits=14, decimal_places=2)
    invoice_number = serializers.CharField(max_length=100)
    invoice_date = serializers.DateField()
    supplier_name = serializers.CharField(max_length=255)
    balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
    )
    forecast_date = serializers.DateField()

    def validate(self, attrs):
        quantity = attrs.get('quantity') or Decimal('0.00')
        rate = attrs.get('rate') or Decimal('0.00')
        amount_exc_vat = quantity * rate
        vat_percent = attrs.get('vat_percent') or Decimal('0.00')
        paid_amount_inc_vat = attrs.get('paid_amount_inc_vat') or Decimal('0.00')

        vat_amount = (amount_exc_vat * vat_percent) / Decimal('100')
        due_amount_inc_vat = amount_exc_vat + vat_amount
        balance = due_amount_inc_vat - paid_amount_inc_vat

        if quantity < 0:
            raise serializers.ValidationError({'quantity': 'Qty cannot be negative.'})

        if rate < 0:
            raise serializers.ValidationError({'rate': 'Rate cannot be negative.'})

        if paid_amount_inc_vat > due_amount_inc_vat:
            raise serializers.ValidationError(
                {'paid_amount_inc_vat': 'Paid Amount Inc VAT cannot exceed Payable Amount.'}
            )

        attrs['amount_exc_vat'] = amount_exc_vat.quantize(Decimal('0.01'))
        attrs['vat_amount'] = vat_amount.quantize(Decimal('0.01'))
        attrs['due_amount_inc_vat'] = due_amount_inc_vat.quantize(Decimal('0.01'))
        attrs['balance'] = balance.quantize(Decimal('0.01'))
        try:
            attrs['account_code'] = normalize_account_code_for_cost_code(
                attrs.get('cost_code'),
                attrs.get('account_code'),
            )
        except ValueError as exc:
            raise serializers.ValidationError({'account_code': str(exc)})
        return attrs


class PettyCashVoucherEntrySerializer(serializers.Serializer):
    voucher_number = serializers.CharField(max_length=100)
    items = PettyCashVoucherItemEntrySerializer(many=True)

    def validate(self, attrs):
        if not attrs.get('items'):
            raise serializers.ValidationError({'items': 'Add at least one petty cash item.'})
        return attrs


class AssetDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetDeposit
        fields = [
            'id',
            'company',
            'serial_number',
            'client_name',
            'project_name',
            'project_name_not_available',
            'currency',
            'amount',
            'mode_of_payment',
            'expiry_date',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class AssetDepositEntrySerializer(serializers.ModelSerializer):
    company = serializers.HiddenField(default=CurrentCompanyDefault())

    class Meta:
        model = AssetDeposit
        fields = [
            'id',
            'company',
            'serial_number',
            'client_name',
            'project_name',
            'project_name_not_available',
            'currency',
            'amount',
            'mode_of_payment',
            'expiry_date',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate(self, attrs):
        company = self.context.get('company')
        serial_number = (attrs.get('serial_number') or '').strip()
        project_name_not_available = attrs.get('project_name_not_available', False)
        project_name = (attrs.get('project_name') or '').strip()
        amount = attrs.get('amount') or Decimal('0.00')

        if not serial_number:
            raise serializers.ValidationError({'serial_number': 'SN is required.'})

        if amount < 0:
            raise serializers.ValidationError({'amount': 'Amount cannot be negative.'})

        if project_name_not_available:
            attrs['project_name'] = ''
        elif not project_name:
            raise serializers.ValidationError(
                {'project_name': 'Project Name is required unless marked not available.'}
            )
        else:
            attrs['project_name'] = project_name

        attrs['serial_number'] = serial_number
        attrs['client_name'] = (attrs.get('client_name') or '').strip()
        attrs['currency'] = (attrs.get('currency') or 'AED').strip() or 'AED'

        existing = AssetDeposit.objects.filter(
            company=company,
            serial_number=serial_number,
        )
        instance = getattr(self, 'instance', None)
        if instance:
            existing = existing.exclude(pk=instance.pk)
        if existing.exists():
            raise serializers.ValidationError({'serial_number': 'SN already exists.'})

        return attrs


class DividendInvestmentEntrySerializer(serializers.ModelSerializer):
    company = serializers.HiddenField(default=CurrentCompanyDefault())

    class Meta:
        model = DividendInvestmentEntry
        fields = [
            'id',
            'company',
            'date',
            'client',
            'paid',
            'received',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def validate(self, attrs):
        paid = attrs.get('paid', Decimal('0.00'))
        received = attrs.get('received', Decimal('0.00'))

        if paid < 0:
            raise serializers.ValidationError({'paid': 'Paid cannot be negative.'})

        if received < 0:
            raise serializers.ValidationError({'received': 'Received cannot be negative.'})

        if paid == 0 and received == 0:
            raise serializers.ValidationError(
                {'received': 'Enter a paid or received amount greater than zero.'}
            )

        return attrs


class GlPeriodClosingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlPeriodClosing
        fields = [
            'id',
            'company',
            'month',
            'year',
            'status',
            'submitted_by',
            'approved_by',
            'submitted_at',
            'approved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class GlPeriodClosingEntrySerializer(serializers.Serializer):
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField(min_value=2000, max_value=2100)


class PcrReportSnapshotSerializer(serializers.ModelSerializer):
    company = serializers.HiddenField(default=CurrentCompanyDefault())

    class Meta:
        model = PcrReportSnapshot
        fields = [
            'id',
            'company',
            'project_number',
            'project_name',
            'quarter',
            'year',
            'status',
            'report_data',
            'submitted_by',
            'approved_by',
            'submitted_at',
            'approved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'company',
            'status',
            'submitted_by',
            'approved_by',
            'submitted_at',
            'approved_at',
            'created_at',
            'updated_at',
        ]


class PcrReportSnapshotEntrySerializer(serializers.Serializer):
    project_number = serializers.CharField(max_length=100)
    project_name = serializers.CharField(max_length=255)
    quarter = serializers.ChoiceField(choices=PcrReportSnapshot.QUARTER_CHOICES)
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    report_data = serializers.JSONField()

    def validate(self, attrs):
        attrs['project_number'] = (attrs.get('project_number') or '').strip()
        attrs['project_name'] = (attrs.get('project_name') or '').strip()

        if not attrs['project_number']:
            raise serializers.ValidationError({'project_number': 'Project # is required.'})

        if not attrs['project_name']:
            raise serializers.ValidationError({'project_name': 'Project Name is required.'})

        if not isinstance(attrs.get('report_data'), dict):
            raise serializers.ValidationError({'report_data': 'Report data must be an object.'})

        return attrs


class BurReportSnapshotSerializer(serializers.ModelSerializer):
    company = serializers.HiddenField(default=CurrentCompanyDefault())

    class Meta:
        model = BurReportSnapshot
        fields = [
            'id',
            'company',
            'quarter',
            'year',
            'status',
            'report_data',
            'submitted_by',
            'reviewed_by',
            'submitted_at',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'company',
            'status',
            'submitted_by',
            'reviewed_by',
            'submitted_at',
            'reviewed_at',
            'created_at',
            'updated_at',
        ]


class BurReportSnapshotEntrySerializer(serializers.Serializer):
    quarter = serializers.ChoiceField(choices=BurReportSnapshot.QUARTER_CHOICES)
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    report_data = serializers.JSONField()

    def validate(self, attrs):
        if not isinstance(attrs.get('report_data'), dict):
            raise serializers.ValidationError({'report_data': 'Report data must be an object.'})

        return attrs
