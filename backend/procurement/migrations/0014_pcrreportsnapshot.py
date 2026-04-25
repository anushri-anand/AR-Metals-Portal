from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0013_paymentphase_gl_date_pettycashvoucheritem_account_code_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PcrReportSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('AKR', 'AKR'), ('ARM', 'ARM')], db_index=True, default='AKR', max_length=10)),
                ('project_number', models.CharField(db_index=True, max_length=100)),
                ('project_name', models.CharField(max_length=255)),
                ('quarter', models.CharField(choices=[('Q1', 'Q1'), ('Q2', 'Q2'), ('Q3', 'Q3'), ('Q4', 'Q4')], db_index=True, max_length=2)),
                ('year', models.PositiveIntegerField(db_index=True)),
                ('status', models.CharField(choices=[('submitted', 'Submitted'), ('approved', 'Approved')], db_index=True, default='submitted', max_length=20)),
                ('report_data', models.JSONField(blank=True, default=dict)),
                ('submitted_by', models.CharField(blank=True, default='', max_length=150)),
                ('approved_by', models.CharField(blank=True, default='', max_length=150)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-year', '-quarter', 'project_number', '-id'],
                'unique_together': {('company', 'project_number', 'quarter', 'year')},
            },
        ),
    ]
