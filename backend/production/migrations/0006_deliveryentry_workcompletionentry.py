import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0005_projectvariation_projectvariationitem_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('variation_number', models.CharField(blank=True, db_index=True, default='', max_length=100)),
                ('date', models.DateField(db_index=True)),
                ('boq_sn', models.CharField(blank=True, db_index=True, default='', max_length=50)),
                ('item_name', models.CharField(db_index=True, max_length=255)),
                ('total_quantity', models.DecimalField(decimal_places=2, max_digits=12)),
                ('unit', models.CharField(max_length=50)),
                ('delivery_note_number', models.CharField(max_length=100)),
                ('quantity', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_entries', to='production.projectdetail')),
            ],
            options={
                'db_table': 'production_status_delivery_entry',
                'ordering': ['-date', 'project__project_number', 'variation_number', 'item_name', 'id'],
            },
        ),
        migrations.CreateModel(
            name='WorkCompletionEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('variation_number', models.CharField(blank=True, db_index=True, default='', max_length=100)),
                ('date', models.DateField(db_index=True)),
                ('boq_sn', models.CharField(blank=True, db_index=True, default='', max_length=50)),
                ('item_name', models.CharField(db_index=True, max_length=255)),
                ('total_quantity', models.DecimalField(decimal_places=2, max_digits=12)),
                ('unit', models.CharField(max_length=50)),
                ('cutting', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('grooving', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('bending', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('fabrication', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('welding', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('finishing', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('coating', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('assembly', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('installation', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='work_completion_entries', to='production.projectdetail')),
            ],
            options={
                'db_table': 'production_status_work_completion_entry',
                'ordering': ['-date', 'project__project_number', 'variation_number', 'item_name', 'id'],
            },
        ),
    ]
