from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0023_contractrevenue_agreed_variation_total'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractrevenue',
            name='contract_ref',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
