from django.db import migrations, models
import django.db.models.deletion


def seed_client_contacts(apps, schema_editor):
    ClientData = apps.get_model('estimation', 'ClientData')
    ClientContact = apps.get_model('estimation', 'ClientContact')
    TenderLog = apps.get_model('estimation', 'TenderLog')

    for client in ClientData.objects.all():
        if not any([client.contact_person, client.mobile_number, client.email]):
            continue

        contact = ClientContact.objects.create(
            client=client,
            name=client.contact_person or '',
            mobile_number=client.mobile_number or '',
            email=client.email or '',
        )

        TenderLog.objects.filter(client_id=client.id, client_contact__isnull=True).update(
            client_contact_id=contact.id
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0018_tenderlog_geography'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientContact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, default='', max_length=255)),
                ('mobile_number', models.CharField(blank=True, default='', max_length=50)),
                ('email', models.EmailField(blank=True, default='', max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contacts', to='estimation.clientdata')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.AddField(
            model_name='tenderlog',
            name='client_contact',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tenders', to='estimation.clientcontact'),
        ),
        migrations.RunPython(seed_client_contacts, noop_reverse),
    ]
