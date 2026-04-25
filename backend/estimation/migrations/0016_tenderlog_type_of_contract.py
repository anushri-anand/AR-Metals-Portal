from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0015_boqitem_package'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenderlog',
            name='type_of_contract',
            field=models.CharField(
                choices=[
                    ('Re-measurable', 'Re-measurable'),
                    ('Lumpsum', 'Lumpsum'),
                    ('Cost Plus', 'Cost Plus'),
                ],
                default='Re-measurable',
                max_length=50,
            ),
        ),
    ]
