from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0009_dividendinvestmententry'),
    ]

    operations = [
        migrations.AddField(
            model_name='pettycashvoucheritem',
            name='quantity',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name='pettycashvoucheritem',
            name='rate',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name='pettycashvoucheritem',
            name='unit',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
