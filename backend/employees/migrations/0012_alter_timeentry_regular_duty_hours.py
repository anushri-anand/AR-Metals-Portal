from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0011_publicholidaydate'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timeentry',
            name='regular_duty_hours',
            field=models.DecimalField(decimal_places=2, default=9.5, max_digits=6),
        ),
    ]
