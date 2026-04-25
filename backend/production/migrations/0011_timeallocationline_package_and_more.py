from django.db import migrations, models


def backfill_package_fields(apps, schema_editor):
    ProjectItem = apps.get_model('production', 'ProjectItem')
    TimeAllocationLine = apps.get_model('production', 'TimeAllocationLine')
    WorkCompletionEntry = apps.get_model('production', 'WorkCompletionEntry')
    DeliveryEntry = apps.get_model('production', 'DeliveryEntry')

    def resolve_package(project_id, item_name, boq_sn=''):
        items = ProjectItem.objects.filter(project_id=project_id, item_name=item_name)
        if boq_sn:
            items = items.filter(boq_sn=boq_sn)
        item = items.order_by('id').first()
        return item.package if item else ''

    for line in TimeAllocationLine.objects.filter(package=''):
        if line.variation_number:
            continue
        package = resolve_package(
            project_id=ProjectItem.objects.filter(
                project__project_number=line.project_number,
                project__company=line.entry.company,
            ).values_list('project_id', flat=True).first(),
            item_name=line.item_name,
            boq_sn=line.boq_sn,
        )
        if package:
            line.package = package
            line.save(update_fields=['package'])

    for entry in WorkCompletionEntry.objects.filter(package=''):
        if entry.variation_number:
            continue
        package = resolve_package(entry.project_id, entry.item_name, entry.boq_sn)
        if package:
            entry.package = package
            entry.save(update_fields=['package'])

    for entry in DeliveryEntry.objects.filter(package=''):
        if entry.variation_number:
            continue
        package = resolve_package(entry.project_id, entry.item_name, entry.boq_sn)
        if package:
            entry.package = package
            entry.save(update_fields=['package'])


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0010_projectdetail_contract_po_ref'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeallocationline',
            name='package',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='workcompletionentry',
            name='package',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='deliveryentry',
            name='package',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.RunPython(backfill_package_fields, migrations.RunPython.noop),
    ]
