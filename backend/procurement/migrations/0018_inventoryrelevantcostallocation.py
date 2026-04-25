from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0017_paymentphase_gl_no'),
    ]

    operations = [
        migrations.CreateModel(
            name='InventoryRelevantCostAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('inventory_line_number', models.PositiveIntegerField()),
                ('relevant_line_number', models.PositiveIntegerField()),
                ('relevant_cost_percentage', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('inventory_purchase_order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='relevant_cost_allocations', to='procurement.purchaseorder')),
                ('relevant_purchase_order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inventory_relevant_cost_allocations', to='procurement.purchaseorder')),
            ],
            options={
                'ordering': ['relevant_purchase_order__po_number', 'inventory_purchase_order__po_number', 'inventory_line_number', 'relevant_line_number'],
                'unique_together': {('inventory_purchase_order', 'inventory_line_number', 'relevant_purchase_order', 'relevant_line_number')},
            },
        ),
    ]
