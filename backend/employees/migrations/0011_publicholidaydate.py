from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0010_timeentry_finish_time_is_2400'),
    ]

    operations = [
        migrations.CreateModel(
            name='PublicHolidayDate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['date'],
            },
        ),
    ]
