from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0010_pettycashvoucheritem_quantity_unit_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='pettycashvoucheritem',
            name='invoice_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
