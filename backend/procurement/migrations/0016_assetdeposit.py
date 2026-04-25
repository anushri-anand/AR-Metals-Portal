from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0015_burreportsnapshot'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssetDeposit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('arm', 'ARM'), ('akr', 'AKR')], db_index=True, default='arm', max_length=10)),
                ('serial_number', models.CharField(max_length=100)),
                ('client_name', models.CharField(max_length=255)),
                ('project_name', models.CharField(blank=True, default='', max_length=255)),
                ('project_name_not_available', models.BooleanField(default=False)),
                ('currency', models.CharField(default='AED', max_length=50)),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('mode_of_payment', models.CharField(choices=[('PDC', 'PDC'), ('CDC', 'CDC'), ('Cash', 'Cash'), ('Transfer', 'Transfer')], max_length=20)),
                ('expiry_date', models.DateField()),
                ('status', models.CharField(choices=[('Submitted', 'Submitted'), ('Returned', 'Returned')], default='Submitted', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-expiry_date', 'serial_number'],
                'unique_together': {('company', 'serial_number')},
            },
        ),
    ]
