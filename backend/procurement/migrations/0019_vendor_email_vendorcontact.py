from django.db import migrations, models
import django.db.models.deletion


def seed_vendor_contacts(apps, schema_editor):
    Vendor = apps.get_model('procurement', 'Vendor')
    VendorContact = apps.get_model('procurement', 'VendorContact')

    for vendor in Vendor.objects.all():
        if not any([vendor.contact_person_name, vendor.mobile_number, vendor.email]):
            continue

        VendorContact.objects.create(
            vendor=vendor,
            name=vendor.contact_person_name or '',
            mobile_number=vendor.mobile_number or '',
            email=vendor.email or '',
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0018_inventoryrelevantcostallocation'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.CreateModel(
            name='VendorContact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=255)),
                ('mobile_number', models.CharField(blank=True, default='', max_length=50)),
                ('email', models.EmailField(blank=True, default='', max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('vendor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contacts', to='procurement.vendor')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.RunPython(seed_vendor_contacts, noop_reverse),
    ]
