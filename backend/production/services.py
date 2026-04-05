from django.core.exceptions import ValidationError

from master_data.models import ProjectItem
from .models import ProductionEntry, DeliveryEntry


def create_production_entry(project_item_id, date, data):
    try:
        project_item = ProjectItem.objects.get(pk=project_item_id)
    except ProjectItem.DoesNotExist:
        raise ValidationError('Project item not found.')

    if not date:
        raise ValidationError('Date is required.')

    fields = [
        'cutting',
        'grooving',
        'bending',
        'fabrication',
        'welding',
        'finishing',
        'coating',
        'assembly',
        'installation',
    ]

    cleaned_data = {}

    for field in fields:
        value = data.get(field, 0)

        try:
            value = int(value or 0)
        except (TypeError, ValueError):
            raise ValidationError(f'{field} must be a number.')

        if value < 0:
            raise ValidationError(f'{field} cannot be negative.')

        cleaned_data[field] = value

    production_entry = ProductionEntry.objects.create(
        project_item=project_item,
        date=date,
        **cleaned_data,
    )

    return production_entry


def create_delivery_entry(project_item_id, date, delivery_number, delivery_quantity):
    try:
        project_item = ProjectItem.objects.get(pk=project_item_id)
    except ProjectItem.DoesNotExist:
        raise ValidationError('Project item not found.')

    if not date:
        raise ValidationError('Date is required.')

    if not delivery_number:
        raise ValidationError('Delivery number is required.')

    try:
        delivery_quantity = int(delivery_quantity)
    except (TypeError, ValueError):
        raise ValidationError('Delivery quantity must be a number.')

    if delivery_quantity < 0:
        raise ValidationError('Delivery quantity cannot be negative.')

    delivery_entry = DeliveryEntry.objects.create(
        project_item=project_item,
        date=date,
        delivery_number=delivery_number,
        delivery_quantity=delivery_quantity,
    )

    return delivery_entry
