from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0020_vendor_vendor_id_po_box'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='trn_no',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
