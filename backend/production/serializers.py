from rest_framework import serializers

from .models import ProjectDetail, ProjectItem


class ProjectItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectItem
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


class ProjectDetailSerializer(serializers.ModelSerializer):
    items = ProjectItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectDetail
        fields = [
            'id',
            'project_name',
            'project_number',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectItemCreateSerializer(serializers.Serializer):
    item_name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit = serializers.CharField(max_length=50)
    estimated_mh = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProjectDetailCreateSerializer(serializers.Serializer):
    project_name = serializers.CharField(max_length=255)
    project_number = serializers.CharField(max_length=100)
    items = ProjectItemCreateSerializer(many=True)

    def validate_project_number(self, value):
        if ProjectDetail.objects.filter(project_number=value).exists():
            raise serializers.ValidationError('Project number already exists.')
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one item is required.')
        return value


class ProjectItemUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit = serializers.CharField(max_length=50)
    estimated_mh = serializers.DecimalField(max_digits=12, decimal_places=2)


class ProjectDetailUpdateSerializer(serializers.Serializer):
    project_number = serializers.CharField(max_length=100)
    items = ProjectItemUpdateSerializer(many=True)

    def validate_project_number(self, value):
        if not ProjectDetail.objects.filter(project_number=value).exists():
            raise serializers.ValidationError('Project not found.')
        return value

    def validate(self, attrs):
        project = ProjectDetail.objects.get(project_number=attrs['project_number'])
        valid_item_ids = set(project.items.values_list('id', flat=True))
        submitted_item_ids = {item['id'] for item in attrs.get('items', [])}

        invalid_item_ids = submitted_item_ids - valid_item_ids
        if invalid_item_ids:
            raise serializers.ValidationError(
                {'items': 'One or more items do not belong to the selected project.'}
            )

        return attrs
