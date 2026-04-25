from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0007_alter_paymentdeliveryitem_quantity_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PettyCashVoucher',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('ARM', 'ARM'), ('AKR', 'AKR')], db_index=True, default='ARM', max_length=10)),
                ('voucher_number', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at', 'voucher_number'],
                'unique_together': {('company', 'voucher_number')},
            },
        ),
        migrations.CreateModel(
            name='PettyCashVoucherItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('line_number', models.PositiveIntegerField()),
                ('item', models.CharField(max_length=255)),
                ('project_name', models.CharField(max_length=255)),
                ('project_number', models.CharField(max_length=100)),
                ('cost_code', models.CharField(choices=[('Material', 'Material'), ('Machining', 'Machining'), ('Coating', 'Coating'), ('Consumables', 'Consumables'), ('Subcontracts', 'Subcontracts'), ('Labour', 'Labour'), ('Freight&Customs', 'Freight&Customs'), ('Prelims', 'Prelims'), ('FOH', 'FOH'), ('Commitments', 'Commitments'), ('Contingency', 'Contingency')], max_length=50)),
                ('amount_exc_vat', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('vat_percent', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('vat_amount', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('due_amount_inc_vat', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('paid_amount_inc_vat', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('invoice_number', models.CharField(max_length=100)),
                ('supplier_name', models.CharField(max_length=255)),
                ('balance', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('forecast_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('voucher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='procurement.pettycashvoucher')),
            ],
            options={
                'ordering': ['voucher', 'line_number'],
                'unique_together': {('voucher', 'line_number')},
            },
        ),
    ]
