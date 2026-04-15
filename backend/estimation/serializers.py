import re
from decimal import Decimal

from rest_framework import serializers

from procurement.models import PurchaseOrder

from .models import (
    BoqItem,
    ClientData,
    ContractPaymentLog,
    ContractRevenue,
    ContractRevenueVariation,
    ContractVariationLog,
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

LABOUR_ROLE_FIELD_MAP = {
    'skilled': 'skilledHours',
    'semiSkilled': 'semiSkilledHours',
    'helper': 'helperHours',
}

LABOUR_ROLE_NAME_MAP = {
    'skilled': ['skilled labour'],
    'semiSkilled': ['semi skilled labour', 'semi-skilled labour', 'semiskilled labour'],
    'helper': ['helper', 'helper labour'],
}


def get_tender_status_options():
    return [
        {'value': value, 'label': label}
        for value, label in TenderLog.STATUS_CHOICES
    ]


def get_latest_revision_summary(tender_number):
    boq_items = list(
        BoqItem.objects.filter(tender_number=tender_number)
        .select_related('costing')
        .prefetch_related('costing__estimate_lines__item', 'costing__labour_lines__item')
    )

    if not boq_items:
        return {
            'revision_number': '',
            'revision_date': None,
            'description': '',
            'selling_amount': Decimal('0.00'),
        }

    latest_revision_number = max(
        {item.revision_number or '' for item in boq_items},
        key=get_revision_sort_key,
    )
    latest_items = [
        item
        for item in boq_items
        if (item.revision_number or '') == latest_revision_number
    ]
    revision_dates = [item.revision_date for item in latest_items if item.revision_date]
    descriptions = []

    for item in latest_items:
        description = item.description.strip()
        if description and description not in descriptions:
            descriptions.append(description)

    return {
        'revision_number': latest_revision_number,
        'revision_date': max(revision_dates) if revision_dates else None,
        'description': '; '.join(descriptions),
        'selling_amount': sum(
            calculate_boq_item_selling_amount(item)
            for item in latest_items
        ),
    }


def get_revision_sort_key(value):
    text = str(value or '').strip()
    numbers = re.findall(r'\d+', text)

    if numbers:
        return (1, int(numbers[-1]), text)

    return (0, 0, text)


def calculate_boq_item_selling_amount(boq_item):
    try:
        costing = boq_item.costing
    except TenderCosting.DoesNotExist:
        return Decimal('0.00')

    estimate_lines = list(costing.estimate_lines.all())
    labour_lines = list(costing.labour_lines.all())

    material_unit_cost = get_estimate_line_amount(
        estimate_lines,
        EstimateCostLine.MATERIAL,
        include_wastage=True,
    )
    production_labour_unit_cost = get_labour_line_amount(
        labour_lines,
        LabourCostLine.PRODUCTION_LABOUR,
    )
    machining_unit_cost = get_estimate_line_amount(
        estimate_lines,
        EstimateCostLine.MACHINING,
    )
    coating_unit_cost = get_estimate_line_amount(
        estimate_lines,
        EstimateCostLine.COATING,
    )
    consumable_unit_cost = get_estimate_line_amount(
        estimate_lines,
        EstimateCostLine.CONSUMABLE,
        include_wastage=True,
    )
    subcontract_unit_cost = get_estimate_line_amount(
        estimate_lines,
        EstimateCostLine.SUBCONTRACT,
    )
    installation_unit_cost = get_labour_line_amount(
        labour_lines,
        LabourCostLine.INSTALLATION_LABOUR,
    )
    base_unit_cost = (
        material_unit_cost
        + production_labour_unit_cost
        + machining_unit_cost
        + coating_unit_cost
        + consumable_unit_cost
        + subcontract_unit_cost
        + installation_unit_cost
    )
    cost_percentage = (
        boq_item.freight_custom_duty_percent
        + boq_item.prelims_percent
        + boq_item.foh_percent
        + boq_item.commitments_percent
        + boq_item.contingencies_percent
    )
    unit_cost = base_unit_cost + (base_unit_cost * cost_percentage / Decimal('100'))
    selling_rate = unit_cost * boq_item.markup

    return selling_rate * boq_item.quantity


def get_estimate_line_amount(estimate_lines, category, include_wastage=False):
    total = Decimal('0.00')

    for line in estimate_lines:
        if line.category != category or not line.item:
            continue

        quantity = line.quantity
        if include_wastage:
            quantity = quantity + (quantity * line.wastage_percent / Decimal('100'))

        total += quantity * line.item.rate

    return total


def get_labour_line_amount(labour_lines, category):
    return sum(
        (
            line.hours * line.item.rate
            for line in labour_lines
            if line.category == category and line.item
        ),
        Decimal('0.00'),
    )


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
    supplierTrnNo = serializers.CharField(
        source='supplier_trn_no',
        required=False,
        allow_blank=True,
    )
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
            'supplierTrnNo',
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
    quoteRef = serializers.CharField(
        source='quote_ref',
        required=False,
        allow_blank=True,
    )
    revisionNumber = serializers.CharField(
        source='revision_number',
        required=False,
        allow_blank=True,
    )
    revisionDate = serializers.DateField(
        source='revision_date',
        required=False,
        allow_null=True,
    )
    clientId = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    clientName = serializers.SerializerMethodField()
    contactName = serializers.SerializerMethodField()
    projectName = serializers.CharField(
        source='project_name',
        required=False,
        allow_blank=True,
    )
    projectLocation = serializers.CharField(
        source='project_location',
        required=False,
        allow_blank=True,
    )
    tenderDate = serializers.DateField(
        source='tender_date',
        required=False,
        allow_null=True,
    )
    description = serializers.CharField(required=False, allow_blank=True)
    sellingAmount = serializers.DecimalField(
        source='selling_amount',
        max_digits=14,
        decimal_places=2,
        required=False,
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
            'quoteRef',
            'revisionNumber',
            'revisionDate',
            'clientId',
            'clientName',
            'contactName',
            'projectName',
            'projectLocation',
            'tenderDate',
            'description',
            'sellingAmount',
            'submissionDate',
            'status',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'clientName', 'created_at', 'updated_at']

    def get_clientName(self, obj):
        return obj.client.client_name if obj.client else ''

    def get_contactName(self, obj):
        return obj.client.contact_person if obj.client else ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        latest_revision = get_latest_revision_summary(instance.tender_number)
        selling_amount = Decimal(str(data.get('sellingAmount') or '0'))

        data['revisionNumber'] = (
            data.get('revisionNumber') or latest_revision['revision_number']
        )
        data['revisionDate'] = data.get('revisionDate') or (
            latest_revision['revision_date'].isoformat()
            if latest_revision['revision_date']
            else None
        )
        data['description'] = data.get('description') or latest_revision['description']

        if selling_amount == Decimal('0.00') and latest_revision['selling_amount']:
            data['sellingAmount'] = (
                f'{latest_revision["selling_amount"].quantize(Decimal("0.01"))}'
            )

        return data

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


class ContractRevenueVariationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    variationNumber = serializers.CharField(source='variation_number')

    class Meta:
        model = ContractRevenueVariation
        fields = [
            'id',
            'variationNumber',
            'amount',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ContractRevenueSerializer(serializers.ModelSerializer):
    projectNumber = serializers.CharField(source='project_number')
    projectName = serializers.CharField(source='project_name')
    contractValue = serializers.DecimalField(
        source='contract_value',
        max_digits=16,
        decimal_places=2,
    )
    startDate = serializers.DateField(
        source='start_date',
        required=False,
        allow_null=True,
    )
    completionDate = serializers.DateField(
        source='completion_date',
        required=False,
        allow_null=True,
    )
    budgetMaterial = serializers.DecimalField(
        source='budget_material',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetMachining = serializers.DecimalField(
        source='budget_machining',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetCoating = serializers.DecimalField(
        source='budget_coating',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetConsumables = serializers.DecimalField(
        source='budget_consumables',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetSubcontracts = serializers.DecimalField(
        source='budget_subcontracts',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetProductionLabour = serializers.DecimalField(
        source='budget_production_labour',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetFreightCustom = serializers.DecimalField(
        source='budget_freight_custom',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetInstallationLabour = serializers.DecimalField(
        source='budget_installation_labour',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetPrelims = serializers.DecimalField(
        source='budget_prelims',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetFoh = serializers.DecimalField(
        source='budget_foh',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetCommitments = serializers.DecimalField(
        source='budget_commitments',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    budgetContingencies = serializers.DecimalField(
        source='budget_contingencies',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    variations = ContractRevenueVariationSerializer(many=True, required=False)

    class Meta:
        model = ContractRevenue
        fields = [
            'id',
            'projectNumber',
            'projectName',
            'contractValue',
            'startDate',
            'completionDate',
            'budgetMaterial',
            'budgetMachining',
            'budgetCoating',
            'budgetConsumables',
            'budgetSubcontracts',
            'budgetProductionLabour',
            'budgetFreightCustom',
            'budgetInstallationLabour',
            'budgetPrelims',
            'budgetFoh',
            'budgetCommitments',
            'budgetContingencies',
            'variations',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        variations_data = validated_data.pop('variations', [])
        revenue = ContractRevenue.objects.create(**validated_data)
        self.save_variations(revenue, variations_data)
        return revenue

    def update(self, instance, validated_data):
        variations_data = validated_data.pop('variations', None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if variations_data is not None:
            instance.variations.all().delete()
            self.save_variations(instance, variations_data)

        return instance

    def save_variations(self, revenue, variations_data):
        for index, variation_data in enumerate(variations_data, start=1):
            variation_data.pop('id', None)
            variation_number = variation_data.get('variation_number') or f'VO# {index}'
            ContractRevenueVariation.objects.create(
                revenue=revenue,
                variation_number=variation_number,
                amount=variation_data.get('amount') or Decimal('0.00'),
            )


class ContractVariationLogSerializer(serializers.ModelSerializer):
    projectNumber = serializers.CharField(source='project_number')
    projectName = serializers.CharField(source='project_name')
    rfvNumber = serializers.CharField(
        source='rfv_number',
        required=False,
        allow_blank=True,
    )
    clientVariationNumber = serializers.CharField(
        source='client_variation_number',
        required=False,
        allow_blank=True,
    )
    documentRef = serializers.CharField(
        source='document_ref',
        required=False,
        allow_blank=True,
    )
    submittedAmount = serializers.DecimalField(
        source='submitted_amount',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    armLetterRef = serializers.CharField(
        source='arm_letter_ref',
        required=False,
        allow_blank=True,
    )
    submittedDate = serializers.DateField(
        source='submitted_date',
        required=False,
        allow_null=True,
    )
    approvedAmount = serializers.DecimalField(
        source='approved_amount',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    clientLetterRef = serializers.CharField(
        source='client_letter_ref',
        required=False,
        allow_blank=True,
    )
    approvedDate = serializers.DateField(
        source='approved_date',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ContractVariationLog
        fields = [
            'id',
            'projectNumber',
            'projectName',
            'rfvNumber',
            'clientVariationNumber',
            'description',
            'documentRef',
            'submittedAmount',
            'armLetterRef',
            'submittedDate',
            'approvedAmount',
            'clientLetterRef',
            'approvedDate',
            'status',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContractPaymentLogSerializer(serializers.ModelSerializer):
    projectNumber = serializers.CharField(source='project_number')
    projectName = serializers.CharField(source='project_name')
    submittedDate = serializers.DateField(
        source='submitted_date',
        required=False,
        allow_null=True,
    )
    approvedDate = serializers.DateField(
        source='approved_date',
        required=False,
        allow_null=True,
    )
    submittedAdvance = serializers.DecimalField(
        source='submitted_advance',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    submittedRecoveryAdvance = serializers.DecimalField(
        source='submitted_recovery_advance',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    grossSubmittedAmount = serializers.DecimalField(
        source='gross_submitted_amount',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    submittedRetention = serializers.DecimalField(
        source='submitted_retention',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    submittedReleaseRetention = serializers.DecimalField(
        source='submitted_release_retention',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    netSubmittedAmount = serializers.DecimalField(
        source='net_submitted_amount',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    submittedVat = serializers.DecimalField(
        source='submitted_vat',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    netSubmittedIncVat = serializers.DecimalField(
        source='net_submitted_inc_vat',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    approvedAdvance = serializers.DecimalField(
        source='approved_advance',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    approvedRecoveryAdvance = serializers.DecimalField(
        source='approved_recovery_advance',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    grossApprovedAmount = serializers.DecimalField(
        source='gross_approved_amount',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    approvedRetention = serializers.DecimalField(
        source='approved_retention',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    approvedReleaseRetention = serializers.DecimalField(
        source='approved_release_retention',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    netApprovedAmount = serializers.DecimalField(
        source='net_approved_amount',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    approvedVat = serializers.DecimalField(
        source='approved_vat',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    netApprovedIncVat = serializers.DecimalField(
        source='net_approved_inc_vat',
        max_digits=16,
        decimal_places=2,
        required=False,
    )
    dueDate = serializers.DateField(
        source='due_date',
        required=False,
        allow_null=True,
    )
    paidDate = serializers.DateField(
        source='paid_date',
        required=False,
        allow_null=True,
    )
    forecastDate = serializers.DateField(
        source='forecast_date',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ContractPaymentLog
        fields = [
            'id',
            'projectNumber',
            'projectName',
            'sn',
            'submittedDate',
            'approvedDate',
            'submittedAdvance',
            'submittedRecoveryAdvance',
            'grossSubmittedAmount',
            'submittedRetention',
            'submittedReleaseRetention',
            'netSubmittedAmount',
            'submittedVat',
            'netSubmittedIncVat',
            'approvedAdvance',
            'approvedRecoveryAdvance',
            'grossApprovedAmount',
            'approvedRetention',
            'approvedReleaseRetention',
            'netApprovedAmount',
            'approvedVat',
            'netApprovedIncVat',
            'dueDate',
            'paidDate',
            'forecastDate',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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
    revisionDate = serializers.DateField(
        source='revision_date',
        required=False,
        allow_null=True,
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
            'revisionDate',
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
        'material': serialize_estimate_lines(costing, EstimateCostLine.MATERIAL),
        'productionLabour': serialize_labour_lines(
            costing,
            LabourCostLine.PRODUCTION_LABOUR,
        ),
        'machining': serialize_estimate_lines(costing, EstimateCostLine.MACHINING),
        'coating': serialize_estimate_lines(costing, EstimateCostLine.COATING),
        'consumable': serialize_estimate_lines(
            costing,
            EstimateCostLine.CONSUMABLE,
        ),
        'subcontract': serialize_estimate_lines(
            costing,
            EstimateCostLine.SUBCONTRACT,
        ),
        'installationLabour': serialize_labour_lines(
            costing,
            LabourCostLine.INSTALLATION_LABOUR,
            include_stages=False,
        ),
    }


def serialize_estimate_lines(costing, category):
    return [
        {
            'itemId': line.item_id if line else '',
            'quantity': line.quantity if line else Decimal('0.00'),
            'wastagePercent': line.wastage_percent if line else Decimal('0.00'),
        }
        for line in costing.estimate_lines.filter(category=category)
        .select_related('item')
        .order_by('id')
    ]


def serialize_labour_lines(costing, category, include_stages=True):
    lines = {
        (line.stage, line.role): line
        for line in costing.labour_lines.filter(category=category).select_related('item')
    }

    if not include_stages:
        return serialize_stage_labour_line(lines, 'Installation')

    return {
        stage: serialize_stage_labour_line(lines, stage)
        for stage in LABOUR_STAGE_NAMES
    }


def serialize_stage_labour_line(lines, stage):
    return {
        'skilledHours': get_labour_hours(lines, stage, 'skilled'),
        'semiSkilledHours': get_labour_hours(lines, stage, 'semiSkilled'),
        'helperHours': get_labour_hours(lines, stage, 'helper'),
    }


def save_tender_costing(boq_item, data):
    costing, _ = TenderCosting.objects.get_or_create(boq_item=boq_item)

    save_estimate_lines(costing, EstimateCostLine.MATERIAL, data.get('material', []))
    save_estimate_lines(costing, EstimateCostLine.MACHINING, data.get('machining', []))
    save_estimate_lines(costing, EstimateCostLine.COATING, data.get('coating', []))
    save_estimate_lines(costing, EstimateCostLine.CONSUMABLE, data.get('consumable', []))
    save_estimate_lines(
        costing,
        EstimateCostLine.SUBCONTRACT,
        data.get('subcontract', []),
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


def save_estimate_lines(costing, category, data):
    rows = data if isinstance(data, list) else [data] if data else []

    EstimateCostLine.objects.filter(
        costing=costing,
        category=category,
    ).delete()

    for row in rows:
        item = get_master_item(row.get('itemId'))
        quantity = to_decimal(row.get('quantity'))
        wastage_percent = to_decimal(row.get('wastagePercent'))

        if not item and quantity == Decimal('0.00') and wastage_percent == Decimal('0.00'):
            continue

        EstimateCostLine.objects.create(
            costing=costing,
            category=category,
            item=item,
            quantity=quantity,
            wastage_percent=wastage_percent,
        )


def save_labour_lines(costing, category, data, include_stages=True):
    LabourCostLine.objects.filter(
        costing=costing,
        category=category,
    ).delete()

    if not include_stages:
        save_labour_stage_lines(costing, category, 'Installation', data or {})
        return

    for stage in LABOUR_STAGE_NAMES:
        save_labour_stage_lines(costing, category, stage, data.get(stage, {}))


def save_labour_stage_lines(costing, category, stage, data):
    for role, field_name in LABOUR_ROLE_FIELD_MAP.items():
        hours = to_decimal(data.get(field_name))
        item = get_labour_master_item(role)

        if hours == Decimal('0.00') and not item:
            continue

        LabourCostLine.objects.create(
            costing=costing,
            category=category,
            stage=stage,
            role=role,
            item=item,
            hours=hours,
            rate=item.rate if item else Decimal('0.00'),
        )


def get_labour_hours(lines, stage, role):
    line = lines.get((stage, role))

    return line.hours if line else Decimal('0.00')


def get_labour_master_item(role):
    for item_description in LABOUR_ROLE_NAME_MAP.get(role, []):
        item = MasterListItem.objects.filter(
            item_description__iexact=item_description
        ).first()
        if item:
            return item

    return None


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
