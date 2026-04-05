from rest_framework import serializers
from .models import Employee, Project, ProjectItem


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class ProjectItemSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True,
    )
    project_name = serializers.CharField(source='project.name', required=False)
    quantity = serializers.IntegerField(required=False, allow_null=True)
    unit = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    estimated_mh = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = ProjectItem
        fields = [
            'id',
            'project',
            'project_name',
            'item_name',
            'quantity',
            'unit',
            'estimated_mh',
            'created_at',
        ]

    def create(self, validated_data):
        project_data = validated_data.pop('project', None)

        project = None
        if isinstance(project_data, dict):
            project_name = project_data.get('name', '').strip()
            if not project_name:
                raise serializers.ValidationError({'project_name': 'Project name is required.'})
            project, _ = Project.objects.get_or_create(name=project_name)
        elif project_data is not None:
            project = project_data
        else:
            raise serializers.ValidationError({'project_name': 'Project name is required.'})

        item_name = validated_data.get('item_name', '').strip()
        if not item_name:
            raise serializers.ValidationError({'item_name': 'Item name is required.'})

        quantity = validated_data.get('quantity')
        unit = validated_data.get('unit')
        estimated_mh = validated_data.get('estimated_mh')

        existing_item = ProjectItem.objects.filter(
            project=project,
            item_name=item_name
        ).first()

        if existing_item:
            updated = False

            if existing_item.quantity is None and quantity is not None:
                existing_item.quantity = quantity
                updated = True

            if (existing_item.unit is None or existing_item.unit.strip() == '') and unit:
                existing_item.unit = unit
                updated = True

            if existing_item.estimated_mh is None and estimated_mh is not None:
                existing_item.estimated_mh = estimated_mh
                updated = True

            if updated:
                existing_item.save()
                return existing_item

            raise serializers.ValidationError({
                'detail': 'This project item already exists.'
            })

        validated_data['project'] = project
        validated_data['item_name'] = item_name
        return super().create(validated_data)
