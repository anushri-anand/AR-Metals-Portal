from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0017_costingrevisionsnapshot'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenderlog',
            name='geography',
            field=models.CharField(
                choices=[('UAE', 'UAE'), ('GCC', 'GCC'), ('Others', 'Others')],
                default='UAE',
                max_length=20,
            ),
        ),
    ]
