from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0016_assetdeposit'),
    ]

    operations = [
        migrations.AddField(
            model_name='paymentphase',
            name='gl_no',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
