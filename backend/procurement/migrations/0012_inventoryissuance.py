from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0011_pettycashvoucheritem_invoice_date'),
    ]

    operations = [
        migrations.CreateModel(
            name='InventoryIssuance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('line_number', models.PositiveIntegerField()),
                ('issuance_date', models.DateField(db_index=True)),
                ('project_name', models.CharField(max_length=255)),
                ('project_number', models.CharField(max_length=100)),
                ('quantity_issued', models.DecimalField(decimal_places=6, default=0, max_digits=14)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('purchase_order', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='inventory_issuances', to='procurement.purchaseorder')),
            ],
            options={
                'ordering': ['issuance_date', 'id'],
            },
        ),
    ]
