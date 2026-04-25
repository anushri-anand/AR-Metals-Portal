from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0006_purchaseorder_approved_at_purchaseorder_line_items_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymentdeliveryitem',
            name='quantity',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name='paymentdeliveryitem',
            name='received_quantity',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=14),
        ),
    ]
