from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0011_timeallocationline_package_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timeallocationline',
            name='item_name',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='timeallocationline',
            name='project_name',
            field=models.CharField(blank=True, db_index=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='timeallocationline',
            name='project_number',
            field=models.CharField(blank=True, db_index=True, default='', max_length=100),
        ),
    ]
