from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('estimation', '0011_contractrevenue_variation_budget_coating_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='boqitem',
            name='quantity',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name='estimatecostline',
            name='quantity',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=14),
        ),
    ]
