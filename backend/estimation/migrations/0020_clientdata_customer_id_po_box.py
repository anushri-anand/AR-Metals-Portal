from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0019_clientcontact_tenderlog_client_contact'),
    ]

    operations = [
        migrations.AddField(
            model_name='clientdata',
            name='customer_id',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='clientdata',
            name='po_box',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
