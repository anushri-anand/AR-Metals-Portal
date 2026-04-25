from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0013_contractpaymentlog_approved_vat_amount_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractpaymentlog',
            name='paid_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=16),
        ),
    ]
