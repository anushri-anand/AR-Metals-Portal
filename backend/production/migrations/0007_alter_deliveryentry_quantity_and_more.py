from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0006_deliveryentry_workcompletionentry'),
    ]

    operations = [
        migrations.AlterField(
            model_name='deliveryentry',
            name='quantity',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='deliveryentry',
            name='total_quantity',
            field=models.DecimalField(decimal_places=6, max_digits=12),
        ),
        migrations.AlterField(
            model_name='projectitem',
            name='quantity',
            field=models.DecimalField(decimal_places=6, max_digits=12),
        ),
        migrations.AlterField(
            model_name='projectvariationitem',
            name='quantity',
            field=models.DecimalField(decimal_places=6, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='assembly',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='bending',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='coating',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='cutting',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='fabrication',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='finishing',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='grooving',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='installation',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='total_quantity',
            field=models.DecimalField(decimal_places=6, max_digits=12),
        ),
        migrations.AlterField(
            model_name='workcompletionentry',
            name='welding',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=12),
        ),
    ]
