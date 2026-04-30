from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0024_contractrevenue_contract_ref'),
    ]

    operations = [
        migrations.AlterField(
            model_name='costingrevisionsnapshot',
            name='company',
            field=models.CharField(choices=[('AKR', 'AKR'), ('ARM', 'ARM')], db_index=True, default='AKR', max_length=10),
        ),
        migrations.AlterField(
            model_name='costingrevisionsnapshot',
            name='status',
            field=models.CharField(choices=[('submitted', 'Submitted'), ('approved', 'Approved'), ('rejected', 'Rejected')], db_index=True, default='submitted', max_length=20),
        ),
    ]
