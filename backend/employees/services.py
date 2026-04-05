from django.core.exceptions import ValidationError
from .models import WorkEntry
from master_data.models import ProjectItem, Employee

def update_pending_work_entry_hours(work_entry_id, hours_worked):
    if hours_worked is None:
        raise ValidationError('Hours worked is required.')

    try:
        hours_worked = int(hours_worked)
    except (TypeError, ValueError):
        raise ValidationError('Hours worked must be a number.')

    if not 0 <= hours_worked <= 20:
        raise ValidationError('Hours worked must be between 0 and 20.')

    try:
        work_entry = WorkEntry.objects.get(pk=work_entry_id, hours_worked__isnull=True)
    except WorkEntry.DoesNotExist:
        raise ValidationError('Pending work entry not found.')

    work_entry.hours_worked = hours_worked
    work_entry.save()

    return work_entry

def create_work_entry(employee_id, project_item_id, date, hours_worked):
    try:
        employee = Employee.objects.get(pk=employee_id)
    except Employee.DoesNotExist:
        raise ValidationError('Employee not found.')

    try:
        project_item = ProjectItem.objects.get(pk=project_item_id)
    except ProjectItem.DoesNotExist:
        raise ValidationError('Project item not found.')

    if not date:
        raise ValidationError('Date is required.')

    if hours_worked is not None:
        try:
            hours_worked = int(hours_worked)
        except (TypeError, ValueError):
            raise ValidationError('Hours worked must be a number.')

        if not 0 <= hours_worked <= 20:
            raise ValidationError('Hours worked must be between 0 and 20.')

    work_entry = WorkEntry.objects.create(
        employee=employee,
        project_item=project_item,
        date=date,
        hours_worked=hours_worked,
    )

    return work_entry