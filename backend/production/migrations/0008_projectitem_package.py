from django.db import migrations, models


def backfill_project_item_package(apps, schema_editor):
    ProjectItem = apps.get_model('production', 'ProjectItem')
    BoqItem = apps.get_model('estimation', 'BoqItem')

    for project_item in ProjectItem.objects.select_related('project').all().iterator():
        project = project_item.project
        boq_items = BoqItem.objects.filter(
            company=project.company,
            tender_number=project.tender_number,
            revision_number=project.revision_number,
        )

        if project_item.boq_sn:
            boq_item = boq_items.filter(sn=project_item.boq_sn).order_by('id').first()
        else:
            boq_item = boq_items.filter(description=project_item.item_name).order_by('id').first()

        if not boq_item:
            continue

        package = boq_item.package or ''

        if package == (project_item.package or ''):
            continue

        project_item.package = package
        project_item.save(update_fields=['package'])


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0015_boqitem_package'),
        ('production', '0007_alter_deliveryentry_quantity_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectitem',
            name='package',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.RunPython(
            backfill_project_item_package,
            migrations.RunPython.noop,
        ),
    ]
