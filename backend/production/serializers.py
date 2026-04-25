from rest_framework import serializers

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


class ProjectItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectItem
        fields = [
            'id',
            'boq_sn',
            'package',
            'item_name',
            'quantity',
            'unit',
            'estimated_mh',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectVariationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectVariationItem
        fields = [
            'id',
            'item_name',
            'quantity',
            'unit',
            'estimated_mh',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectVariationSerializer(serializers.ModelSerializer):
    project_number = serializers.CharField(source='project.project_number', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    items = ProjectVariationItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectVariation
        fields = [
            'id',
            'project_number',
            'project_name',
            'variation_number',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectDetailSerializer(serializers.ModelSerializer):
    items = ProjectItemSerializer(many=True, read_only=True)
    variations = ProjectVariationSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectDetail
        fields = [
            'id',
            'tender_number',
            'revision_number',
            'project_name',
            'project_number',
            'contract_po_ref',
            'items',
            'variations',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectItemCreateSerializer(serializers.Serializer):
    boq_sn = serializers.CharField(max_length=50, required=False, allow_blank=True)
    package = serializers.CharField(max_length=255, required=False, allow_blank=True)
    item_name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=6)
    unit = serializers.CharField(max_length=50)
    estimated_mh = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProjectVariationItemCreateSerializer(serializers.Serializer):
    item_name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=6)
    unit = serializers.CharField(max_length=50)
    estimated_mh = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProjectDetailCreateSerializer(serializers.Serializer):
    tender_number = serializers.CharField(max_length=100)
    project_number = serializers.CharField(max_length=100)
    contract_po_ref = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_project_number(self, value):
        company = self.context.get('company')

        if company and ProjectDetail.objects.filter(
            company=company,
            project_number=value,
        ).exists():
            raise serializers.ValidationError('Project number already exists.')
        return value


class ProjectItemUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=6)
    unit = serializers.CharField(max_length=50)
    estimated_mh = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProjectDetailUpdateSerializer(serializers.Serializer):
    project_number = serializers.CharField(max_length=100)
    items = ProjectItemUpdateSerializer(many=True)

    def validate_project_number(self, value):
        company = self.context.get('company')

        if company and not ProjectDetail.objects.filter(
            company=company,
            project_number=value,
        ).exists():
            raise serializers.ValidationError('Project not found.')
        return value

    def validate(self, attrs):
        project = ProjectDetail.objects.get(
            company=self.context.get('company'),
            project_number=attrs['project_number'],
        )
        valid_item_ids = set(project.items.values_list('id', flat=True))
        submitted_item_ids = {item['id'] for item in attrs.get('items', [])}

        invalid_item_ids = submitted_item_ids - valid_item_ids
        if invalid_item_ids:
            raise serializers.ValidationError(
                {'items': 'One or more items do not belong to the selected project.'}
            )

        return attrs


class ProjectVariationCreateSerializer(serializers.Serializer):
    project_number = serializers.CharField(max_length=100)
    variation_number = serializers.CharField(max_length=100)
    items = ProjectVariationItemCreateSerializer(many=True)

    def validate_project_number(self, value):
        value = value.strip()
        company = self.context.get('company')

        if company and not ProjectDetail.objects.filter(
            company=company,
            project_number=value,
        ).exists():
            raise serializers.ValidationError('Project not found.')
        return value

    def validate(self, attrs):
        company = self.context.get('company')
        variation_number = attrs['variation_number'].strip()
        items = attrs.get('items', [])

        if not variation_number:
            raise serializers.ValidationError(
                {'variation_number': 'Variation # is required.'}
            )

        if not items:
            raise serializers.ValidationError(
                {'items': 'Add at least one variation item.'}
            )

        attrs['variation_number'] = variation_number
        project = ProjectDetail.objects.get(
            company=company,
            project_number=attrs['project_number'],
        )

        if ProjectVariation.objects.filter(
            project=project,
            variation_number=variation_number,
        ).exists():
            raise serializers.ValidationError(
                {'variation_number': 'Variation # already exists for this project.'}
            )

        return attrs


class TimeAllocationLineInputSerializer(serializers.Serializer):
    project_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    project_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    variation_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    package = serializers.CharField(max_length=255, required=False, allow_blank=True)
    percentage = serializers.DecimalField(max_digits=6, decimal_places=2)


class TimeAllocationEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    employee_id = serializers.CharField(max_length=100)
    employee_name = serializers.CharField(max_length=255)
    cost_code = serializers.CharField(max_length=100, required=False, allow_blank=True)
    account_code = serializers.CharField(max_length=100, required=False, allow_blank=True)
    allocations = TimeAllocationLineInputSerializer(many=True)


class TimeAllocationLineSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source='entry.date', read_only=True)
    employee_id = serializers.CharField(source='entry.employee_id', read_only=True)
    employee_name = serializers.CharField(source='entry.employee_name', read_only=True)
    cost_code = serializers.CharField(source='entry.cost_code', read_only=True)
    account_code = serializers.CharField(source='entry.account_code', read_only=True)

    class Meta:
        model = TimeAllocationLine
        fields = [
            'id',
            'date',
            'employee_id',
            'employee_name',
            'cost_code',
            'account_code',
            'project_number',
            'project_name',
            'variation_number',
            'package',
            'boq_sn',
            'item_name',
            'percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TimeAllocationEntrySerializer(serializers.ModelSerializer):
    lines = TimeAllocationLineSerializer(many=True, read_only=True)

    class Meta:
        model = TimeAllocationEntry
        fields = [
            'id',
            'date',
            'employee_id',
            'employee_name',
            'cost_code',
            'account_code',
            'lines',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkCompletionEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    project_number = serializers.CharField(max_length=100)
    project_name = serializers.CharField(max_length=255)
    variation_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    package = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cutting = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    grooving = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    bending = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    fabrication = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    welding = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    finishing = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    coating = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    assembly = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')
    installation = serializers.DecimalField(max_digits=12, decimal_places=6, required=False, default='0.00')


class DeliveryEntryCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    project_number = serializers.CharField(max_length=100)
    project_name = serializers.CharField(max_length=255)
    variation_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    package = serializers.CharField(max_length=255, required=False, allow_blank=True)
    item_name = serializers.CharField(max_length=255)
    boq_sn = serializers.CharField(max_length=50, required=False, allow_blank=True)
    delivery_note_number = serializers.CharField(max_length=100)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=6)


class WorkCompletionEntrySerializer(serializers.ModelSerializer):
    project_number = serializers.CharField(source='project.project_number', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = WorkCompletionEntry
        fields = [
            'id',
            'date',
            'project_number',
            'project_name',
            'variation_number',
            'package',
            'boq_sn',
            'item_name',
            'total_quantity',
            'unit',
            'cutting',
            'grooving',
            'bending',
            'fabrication',
            'welding',
            'finishing',
            'coating',
            'assembly',
            'installation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryEntrySerializer(serializers.ModelSerializer):
    project_number = serializers.CharField(source='project.project_number', read_only=True)
    project_name = serializers.CharField(source='project.project_name', read_only=True)

    class Meta:
        model = DeliveryEntry
        fields = [
            'id',
            'date',
            'project_number',
            'project_name',
            'variation_number',
            'package',
            'boq_sn',
            'item_name',
            'total_quantity',
            'unit',
            'delivery_note_number',
            'quantity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductionStatusSummaryRequestSerializer(serializers.Serializer):
    project_number = serializers.CharField(max_length=100)
    project_name = serializers.CharField(max_length=255)
    variation_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    package = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ProductionStatusBreakdownRequestSerializer(
    ProductionStatusSummaryRequestSerializer
):
    STAGE_CHOICES = (
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
    )
    BASIS_CHOICES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    )

    stage = serializers.ChoiceField(choices=STAGE_CHOICES)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    basis = serializers.ChoiceField(choices=BASIS_CHOICES, default='daily')

    def validate(self, attrs):
        attrs = super().validate(attrs)
        date_from = attrs.get('date_from')
        date_to = attrs.get('date_to')

        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                {'date_to': 'To date must be on or after from date.'}
            )

        return attrs
