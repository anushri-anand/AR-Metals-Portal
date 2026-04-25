import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('production', '0004_timeallocationentry_projectitem_boq_sn_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectVariation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('variation_number', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variations', to='production.projectdetail')),
            ],
            options={
                'ordering': ['project', 'variation_number', 'id'],
                'unique_together': {('project', 'variation_number')},
            },
        ),
        migrations.CreateModel(
            name='ProjectVariationItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_name', models.CharField(max_length=255)),
                ('quantity', models.DecimalField(decimal_places=2, max_digits=12)),
                ('unit', models.CharField(max_length=50)),
                ('estimated_mh', models.DecimalField(decimal_places=2, max_digits=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('variation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='production.projectvariation')),
            ],
            options={
                'ordering': ['variation', 'id'],
            },
        ),
        migrations.AddField(
            model_name='timeallocationline',
            name='variation_number',
            field=models.CharField(blank=True, db_index=True, default='', max_length=100),
        ),
        migrations.AlterModelOptions(
            name='timeallocationline',
            options={'ordering': ['entry', 'project_number', 'variation_number', 'boq_sn', 'item_name', 'id']},
        ),
    ]
