from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0008_pettycashvoucher_pettycashvoucheritem'),
    ]

    operations = [
        migrations.CreateModel(
            name='DividendInvestmentEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('ARM', 'ARM'), ('AKR', 'AKR')], db_index=True, default='ARM', max_length=10)),
                ('date', models.DateField(db_index=True)),
                ('client', models.CharField(max_length=255)),
                ('paid', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('received', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['date', 'id'],
            },
        ),
    ]
