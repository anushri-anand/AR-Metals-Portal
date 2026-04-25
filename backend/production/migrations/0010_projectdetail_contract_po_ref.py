from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0009_timeallocationentry_account_code_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectdetail',
            name='contract_po_ref',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
