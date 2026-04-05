from rest_framework import serializers
from .models import WorkEntry


class WorkEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    designation = serializers.CharField(source='employee.designation', read_only=True)
    project_name = serializers.CharField(source='project_item.project.name', read_only=True)
    item_name = serializers.CharField(source='project_item.item_name', read_only=True)

    class Meta:
        model = WorkEntry
        fields = [
            'id',
            'employee',
            'employee_name',
            'designation',
            'project_item',
            'project_name',
            'item_name',
            'date',
            'hours_worked',
            'created_at',
        ]

    def validate_hours_worked(self, value):
        if value is not None and not 0 <= value <= 20:
            raise serializers.ValidationError('Hours worked must be between 0 and 20.')
        return value
