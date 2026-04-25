from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0008_projectitem_package'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeallocationentry',
            name='account_code',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='timeallocationentry',
            name='cost_code',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
