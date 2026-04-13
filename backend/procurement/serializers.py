from rest_framework import serializers

from .models import PaymentEntry, PaymentPhase, PurchaseOrder, Vendor


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
            'created_at',
        ]
        read_only_fields = ['id', 'supplier_name', 'created_at']


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


class PaymentPhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentPhase
        fields = [
            'id',
            'phase_number',
            'amount',
            'due_date',
            'forecast_date',
            'paid',
            'paid_date',
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

    class Meta:
        model = PaymentEntry
        fields = [
            'id',
            'purchase_order',
            'po_number',
            'project_name',
            'supplier_name',
            'advance',
            'delivery',
            'retention',
            'phases',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'po_number',
            'project_name',
            'supplier_name',
            'phases',
            'created_at',
            'updated_at',
        ]


class PaymentPhaseCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    due_date = serializers.DateField()
    forecast_date = serializers.DateField(required=False, allow_null=True)
    paid = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        default='0.00',
    )
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
    phases = PaymentPhaseCreateSerializer(many=True)

    def validate_po_number(self, value):
        if not PurchaseOrder.objects.filter(po_number=value).exists():
            raise serializers.ValidationError('PO not found.')

        if PaymentEntry.objects.filter(purchase_order__po_number=value).exists():
            raise serializers.ValidationError('Payment entry already exists for this PO.')

        return value


class PaymentPhaseUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    forecast_date = serializers.DateField()
    paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    paid_date = serializers.DateField(required=False, allow_null=True)


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
