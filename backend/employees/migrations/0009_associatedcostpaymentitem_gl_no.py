from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0008_associatedcostentry_entry_type_and_line_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='associatedcostpaymentitem',
            name='gl_no',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
