from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0012_alter_boqitem_quantity_alter_estimatecostline_quantity'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractpaymentlog',
            name='approved_vat_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=16),
        ),
        migrations.AddField(
            model_name='contractpaymentlog',
            name='submitted_vat_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=16),
        ),
    ]
