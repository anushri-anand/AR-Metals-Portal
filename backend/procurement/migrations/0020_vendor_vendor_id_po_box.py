from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0019_vendor_email_vendorcontact'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='vendor_id',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='vendor',
            name='po_box',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
