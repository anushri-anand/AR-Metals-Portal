from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0009_associatedcostpaymentitem_gl_no'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeentry',
            name='finish_time_is_2400',
            field=models.BooleanField(default=False),
        ),
    ]
