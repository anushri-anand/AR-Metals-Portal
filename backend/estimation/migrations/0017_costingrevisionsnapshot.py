from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0016_tenderlog_type_of_contract'),
    ]

    operations = [
        migrations.CreateModel(
            name='CostingRevisionSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('ARM', 'ARM'), ('AKR', 'AKR')], db_index=True, default='ARM', max_length=10)),
                ('tender_number', models.CharField(db_index=True, max_length=100)),
                ('project_name', models.CharField(blank=True, default='', max_length=255)),
                ('revision_number', models.CharField(blank=True, db_index=True, default='', max_length=50)),
                ('status', models.CharField(choices=[('submitted', 'Submitted'), ('approved', 'Approved')], db_index=True, default='submitted', max_length=20)),
                ('submitted_by', models.CharField(blank=True, default='', max_length=150)),
                ('approved_by', models.CharField(blank=True, default='', max_length=150)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['tender_number', 'revision_number', '-submitted_at', '-id'],
                'unique_together': {('company', 'tender_number', 'revision_number')},
            },
        ),
    ]
