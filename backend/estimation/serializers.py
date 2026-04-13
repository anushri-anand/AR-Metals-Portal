from decimal import Decimal

from rest_framework import serializers

from procurement.models import PurchaseOrder

from .models import (
    BoqItem,
    ClientData,
    EstimateCostLine,
    LabourCostLine,
    MasterListItem,
    TenderLog,
    TenderCosting,
)


LABOUR_STAGE_NAMES = [
    'Cutting',
    'Grooving',
    'Bending',
    'Fabrication',
    'Welding',
    'Finishing',
    'Coating',
    'Assembly',
    'Installation',
    'Packing',
]
class MasterListItemSerializer(serializers.ModelSerializer):
    itemDescription = serializers.CharField(source='item_description')
    poRefNumber = serializers.SerializerMethodField()

    class Meta:
        model = MasterListItem
        fields = [
            'id',
            'itemDescription',
            'unit',
            'rate',
            'poRefNumber',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'poRefNumber', 'created_at', 'updated_at']

    def get_poRefNumber(self, obj):
        return obj.po_ref.po_number if obj.po_ref else ''

    def create(self, validated_data):
        po_ref_number = self.initial_data.get('poRefNumber', '')
        po_ref = None

        if po_ref_number:
            po_ref = PurchaseOrder.objects.filter(po_number=po_ref_number).first()
            if not po_ref:
                raise serializers.ValidationError(
                    {'poRefNumber': 'Purchase order not found.'}
                )

        return MasterListItem.objects.create(
            po_ref=po_ref,
            **validated_data,
        )

    def update(self, instance, validated_data):
        po_ref_number = self.initial_data.get('poRefNumber')

        if po_ref_number is not None:
            instance.po_ref = (
                PurchaseOrder.objects.filter(po_number=po_ref_number).first()
                if po_ref_number
                else None
            )

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class ClientDataSerializer(serializers.ModelSerializer):
    clientName = serializers.CharField(source='client_name')
    contactPerson = serializers.CharField(
        source='contact_person',
        required=False,
        allow_blank=True,
    )
    mobileNumber = serializers.CharField(
        source='mobile_number',
        required=False,
        allow_blank=True,
    )
    companyTelNumber = serializers.CharField(
        source='company_tel_number',
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = ClientData
        fields = [
            'id',
            'clientName',
            'country',
            'city',
            'contactPerson',
            'mobileNumber',
            'companyTelNumber',
            'email',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenderLogSerializer(serializers.ModelSerializer):
    tenderNumber = serializers.CharField(source='tender_number')
    tenderName = serializers.CharField(
        source='tender_name',
        required=False,
        allow_blank=True,
    )
    clientId = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    clientName = serializers.SerializerMethodField()
    projectName = serializers.CharField(
        source='project_name',
        required=False,
        allow_blank=True,
    )
    tenderDate = serializers.DateField(
        source='tender_date',
        required=False,
        allow_null=True,
    )
    submissionDate = serializers.DateField(
        source='submission_date',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TenderLog
        fields = [
            'id',
            'tenderNumber',
            'tenderName',
            'clientId',
            'clientName',
            'projectName',
            'tenderDate',
            'submissionDate',
            'status',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'clientName', 'created_at', 'updated_at']

    def get_clientName(self, obj):
        return obj.client.client_name if obj.client else ''

    def create(self, validated_data):
        client_id = validated_data.pop('clientId', None)
        client = ClientData.objects.filter(id=client_id).first() if client_id else None

        return TenderLog.objects.create(client=client, **validated_data)

    def update(self, instance, validated_data):
        client_id = validated_data.pop('clientId', None)

        if client_id is not None:
            instance.client = (
                ClientData.objects.filter(id=client_id).first()
                if client_id
                else None
            )

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class BoqItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    tenderNumber = serializers.CharField(
        source='tender_number',
        required=False,
        default='',
    )
    revisionNumber = serializers.CharField(
        source='revision_number',
        required=False,
        allow_blank=True,
        default='',
    )
    clientsBoq = serializers.CharField(
        source='clients_boq',
        required=False,
        allow_blank=True,
    )
    freightCustomDutyPercent = serializers.DecimalField(
        source='freight_custom_duty_percent',
        max_digits=8,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    prelimsPercent = serializers.DecimalField(
        source='prelims_percent',
        max_digits=8,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    fohPercent = serializers.DecimalField(
        source='foh_percent',
        max_digits=8,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    commitmentsPercent = serializers.DecimalField(
        source='commitments_percent',
        max_digits=8,
        decimal_places=2,
        required=False,
        default='0.00',
    )
    contingenciesPercent = serializers.DecimalField(
        source='contingencies_percent',
        max_digits=8,
        decimal_places=2,
        required=False,
        default='0.00',
    )

    class Meta:
        model = BoqItem
        fields = [
            'id',
            'sn',
            'tenderNumber',
            'revisionNumber',
            'clientsBoq',
            'description',
            'quantity',
            'unit',
            'freightCustomDutyPercent',
            'prelimsPercent',
            'fohPercent',
            'commitmentsPercent',
            'contingenciesPercent',
            'markup',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


def serialize_tender_costing(costing):
    boq_item = costing.boq_item

    return {
        'id': costing.id,
        'boqItemId': boq_item.id,
        'tenderNumber': boq_item.tender_number,
        'material': serialize_estimate_line(costing, EstimateCostLine.MATERIAL),
        'productionLabour': serialize_labour_lines(
            costing,
            LabourCostLine.PRODUCTION_LABOUR,
        ),
        'machining': serialize_estimate_line(costing, EstimateCostLine.MACHINING),
        'coating': serialize_estimate_line(costing, EstimateCostLine.COATING),
        'consumable': serialize_estimate_line(
            costing,
            EstimateCostLine.CONSUMABLE,
        ),
        'subcontract': serialize_estimate_line(
            costing,
            EstimateCostLine.SUBCONTRACT,
        ),
        'installationLabour': serialize_labour_lines(
            costing,
            LabourCostLine.INSTALLATION_LABOUR,
            include_stages=False,
        ),
    }


def serialize_estimate_line(costing, category):
    line = costing.estimate_lines.filter(category=category).select_related('item').first()

    return {
        'itemId': line.item_id if line else '',
        'quantity': line.quantity if line else Decimal('0.00'),
        'wastagePercent': line.wastage_percent if line else Decimal('0.00'),
    }


def serialize_labour_lines(costing, category, include_stages=True):
    lines = {
        (line.stage, line.role): line
        for line in costing.labour_lines.filter(category=category).select_related('item')
    }

    if not include_stages:
        line = lines.get(('Installation', 'skilled'))

        return {
            'itemId': line.item_id if line else '',
            'hours': line.hours if line else Decimal('0.00'),
        }

    return {
        stage: serialize_stage_labour_line(lines, stage)
        for stage in LABOUR_STAGE_NAMES
    }


def serialize_stage_labour_line(lines, stage):
    line = lines.get((stage, 'skilled'))

    if not line:
        line = next((value for key, value in lines.items() if key[0] == stage), None)

    return {
        'itemId': line.item_id if line else '',
        'hours': line.hours if line else Decimal('0.00'),
    }


def save_tender_costing(boq_item, data):
    costing, _ = TenderCosting.objects.get_or_create(boq_item=boq_item)

    save_estimate_line(costing, EstimateCostLine.MATERIAL, data.get('material', {}))
    save_estimate_line(costing, EstimateCostLine.MACHINING, data.get('machining', {}))
    save_estimate_line(costing, EstimateCostLine.COATING, data.get('coating', {}))
    save_estimate_line(costing, EstimateCostLine.CONSUMABLE, data.get('consumable', {}))
    save_estimate_line(
        costing,
        EstimateCostLine.SUBCONTRACT,
        data.get('subcontract', {}),
    )
    save_labour_lines(
        costing,
        LabourCostLine.PRODUCTION_LABOUR,
        data.get('productionLabour', {}),
    )
    save_labour_lines(
        costing,
        LabourCostLine.INSTALLATION_LABOUR,
        data.get('installationLabour', {}),
        include_stages=False,
    )

    return costing


def save_estimate_line(costing, category, data):
    item = get_master_item(data.get('itemId'))

    EstimateCostLine.objects.update_or_create(
        costing=costing,
        category=category,
        defaults={
            'item': item,
            'quantity': to_decimal(data.get('quantity')),
            'wastage_percent': to_decimal(data.get('wastagePercent')),
        },
    )


def save_labour_lines(costing, category, data, include_stages=True):
    if not include_stages:
        LabourCostLine.objects.filter(
            costing=costing,
            category=category,
        ).exclude(stage='Installation', role='skilled').delete()
        LabourCostLine.objects.update_or_create(
            costing=costing,
            category=category,
            stage='Installation',
            role='skilled',
            defaults={
                'item': get_master_item(data.get('itemId')),
                'hours': to_decimal(data.get('hours')),
                'rate': Decimal('0.00'),
            },
        )
        return

    for stage in LABOUR_STAGE_NAMES:
        stage_data = data.get(stage, {})

        LabourCostLine.objects.filter(
            costing=costing,
            category=category,
            stage=stage,
        ).exclude(role='skilled').delete()
        LabourCostLine.objects.update_or_create(
            costing=costing,
            category=category,
            stage=stage,
            role='skilled',
            defaults={
                'item': get_master_item(stage_data.get('itemId')),
                'hours': to_decimal(stage_data.get('hours')),
                'rate': Decimal('0.00'),
            },
        )


def get_master_item(value):
    if not value:
        return None

    try:
        return MasterListItem.objects.get(id=value)
    except (MasterListItem.DoesNotExist, ValueError, TypeError):
        return None


def to_decimal(value):
    if value in (None, ''):
        return Decimal('0.00')

    try:
        return Decimal(str(value))
    except Exception:
        return Decimal('0.00')
