from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0024_contractrevenue_contract_ref'),
        ('production', '0012_timeallocationline_optional_project_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='deliveryentry',
            name='contract',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='delivery_entries',
                to='estimation.contractrevenue',
            ),
        ),
        migrations.AlterField(
            model_name='deliveryentry',
            name='project',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='delivery_entries',
                to='production.projectdetail',
            ),
        ),
        migrations.AddField(
            model_name='workcompletionentry',
            name='contract',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='work_completion_entries',
                to='estimation.contractrevenue',
            ),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='project',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='work_completion_entries',
                to='production.projectdetail',
            ),
        ),
    ]
