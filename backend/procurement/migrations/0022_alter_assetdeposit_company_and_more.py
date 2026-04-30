from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0021_vendor_trn_no'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assetdeposit',
            name='company',
            field=models.CharField(choices=[('AKR', 'AKR'), ('ARM', 'ARM')], db_index=True, default='AKR', max_length=10),
        ),
        migrations.AlterField(
            model_name='dividendinvestmententry',
            name='company',
            field=models.CharField(choices=[('AKR', 'AKR'), ('ARM', 'ARM')], db_index=True, default='AKR', max_length=10),
        ),
        migrations.AlterField(
            model_name='pettycashvoucher',
            name='company',
            field=models.CharField(choices=[('AKR', 'AKR'), ('ARM', 'ARM')], db_index=True, default='AKR', max_length=10),
        ),
        migrations.AlterField(
            model_name='purchaseorder',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('approved', 'Approved'), ('rejected', 'Rejected')], db_index=True, default='draft', max_length=20),
        ),
    ]
