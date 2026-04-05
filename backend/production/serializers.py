from rest_framework import serializers
from .models import ProductionEntry, DeliveryEntry


class ProductionEntrySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project_item.project.name', read_only=True)
    item_name = serializers.CharField(source='project_item.item_name', read_only=True)

    class Meta:
        model = ProductionEntry
        fields = [
            'id',
            'project_item',
            'project_name',
            'item_name',
            'date',
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
        ]


class DeliveryEntrySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project_item.project.name', read_only=True)
    item_name = serializers.CharField(source='project_item.item_name', read_only=True)

    class Meta:
        model = DeliveryEntry
        fields = [
            'id',
            'project_item',
            'project_name',
            'item_name',
            'date',
            'delivery_number',
            'delivery_quantity',
            'created_at',
        ]
