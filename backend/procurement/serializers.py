import re
from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from .models import (
    PaymentDeliveryItem,
    PaymentEntry,
    PaymentPhase,
    PurchaseOrder,
    Vendor,
)


def parse_purchase_order_items(purchase_order):
    rows = []

    for line_number, raw_line in enumerate(
        purchase_order.item_description.splitlines(),
        start=1,
    ):
        line = raw_line.strip()

        if not line:
            continue

        rows.append(parse_purchase_order_item_line(line, line_number))

    return rows


def parse_purchase_order_item_line(line, line_number):
    item_description = re.sub(r'^\d+\.\s*', '', line).split('|', maxsplit=1)[0].strip()

    return {
        'line_number': line_number,
        'item_description': item_description or line,
        'quantity': get_line_decimal(line, r'Qty:\s*([^|]+)'),
        'unit': get_line_text(line, r'Unit:\s*([^|]+)'),
        'rate': get_line_decimal(line, r'Rate:\s*([^|]+)'),
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


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'id',
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
    purchase_items = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'po_number',
            'project_number',
            'project_name',
            'cost_code',
            'po_date_original',
            'po_date_revised',
            'po_rev_number',
            'supplier',
            'supplier_name',
            'item_description',
            'currency',
            'po_amount',
            'exchange_rate',
            'po_amount_aed',
            'vat_aed',
            'po_amount_inc_vat_aed',
            'mode_of_payment',
            'remarks',
            'purchase_items',
            'created_at',
        ]
        read_only_fields = ['id', 'supplier_name', 'purchase_items', 'created_at']

    def get_purchase_items(self, obj):
        return parse_purchase_order_items(obj)


class PurchaseOrderEntrySerializer(serializers.Serializer):
    po_number = serializers.CharField(max_length=100)
    project_number = serializers.CharField(max_length=100)
    project_name = serializers.CharField(max_length=255)
    cost_code = serializers.ChoiceField(choices=PurchaseOrder.COST_CODE_CHOICES)

    po_date_original = serializers.DateField()
    po_date_revised = serializers.DateField(required=False, allow_null=True)
    po_rev_number = serializers.CharField(required=False, allow_blank=True)

    supplier_name = serializers.CharField(max_length=255)

    item_description = serializers.CharField()
    currency = serializers.CharField(max_length=50)

    po_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    exchange_rate = serializers.DecimalField(max_digits=14, decimal_places=4)
    vat_aed = serializers.DecimalField(max_digits=14, decimal_places=2)

    mode_of_payment = serializers.ChoiceField(choices=PurchaseOrder.MODE_OF_PAYMENT_CHOICES)
    remarks = serializers.CharField(required=False, allow_blank=True)

    def validate_po_number(self, value):
        if PurchaseOrder.objects.filter(po_number=value).exists():
            raise serializers.ValidationError('PO number already exists.')
        return value

    def validate_supplier_name(self, value):
        if not Vendor.objects.filter(supplier_name=value).exists():
            raise serializers.ValidationError('Supplier not found in Vendor Data.')
        return value


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
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'phase_number', 'created_at', 'updated_at']


class PaymentEntrySerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    project_name = serializers.CharField(source='purchase_order.project_name', read_only=True)
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

    class Meta:
        model = PaymentEntry
        fields = [
            'id',
            'purchase_order',
            'po_number',
            'project_name',
            'supplier_name',
            'advance',
            'recovery_advance',
            'delivery',
            'retention',
            'release_retention',
            'net_payable_amount',
            'delivery_items',
            'phases',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'po_number',
            'project_name',
            'supplier_name',
            'net_payable_amount',
            'delivery_items',
            'phases',
            'created_at',
            'updated_at',
        ]


class PaymentDeliveryItemCreateSerializer(serializers.Serializer):
    line_number = serializers.IntegerField(min_value=1)
    received_quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
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
        if not PurchaseOrder.objects.filter(po_number=value).exists():
            raise serializers.ValidationError('PO not found.')

        if PaymentEntry.objects.filter(purchase_order__po_number=value).exists():
            raise serializers.ValidationError('Payment entry already exists for this PO.')

        return value

    def validate(self, attrs):
        purchase_order = PurchaseOrder.objects.get(po_number=attrs['po_number'])
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
