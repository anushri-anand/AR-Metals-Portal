from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0014_contractpaymentlog_paid_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='boqitem',
            name='package',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
