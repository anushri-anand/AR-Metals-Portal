from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0014_pcrreportsnapshot'),
    ]

    operations = [
        migrations.CreateModel(
            name='BurReportSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('AKR', 'AKR'), ('ARM', 'ARM')], db_index=True, default='AKR', max_length=10)),
                ('quarter', models.CharField(choices=[('Q1', 'Q1'), ('Q2', 'Q2'), ('Q3', 'Q3'), ('Q4', 'Q4')], db_index=True, max_length=2)),
                ('year', models.PositiveIntegerField(db_index=True)),
                ('status', models.CharField(choices=[('submitted', 'Submitted'), ('approved', 'Approved'), ('rejected', 'Rejected')], db_index=True, default='submitted', max_length=20)),
                ('report_data', models.JSONField(blank=True, default=dict)),
                ('submitted_by', models.CharField(blank=True, default='', max_length=150)),
                ('reviewed_by', models.CharField(blank=True, default='', max_length=150)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-year', '-quarter', '-id'],
                'unique_together': {('company', 'quarter', 'year')},
            },
        ),
    ]
