from django.db import migrations, models


def backfill_associated_cost_line_fields(apps, schema_editor):
    AssociatedCostEntry = apps.get_model('employees', 'AssociatedCostEntry')
    AssociatedCostItem = apps.get_model('employees', 'AssociatedCostItem')
    AssociatedCostPaymentItem = apps.get_model('employees', 'AssociatedCostPaymentItem')

    for entry in AssociatedCostEntry.objects.all():
        AssociatedCostItem.objects.filter(entry=entry).update(
            cost_code=entry.cost_code,
        )

    for payment_item in AssociatedCostPaymentItem.objects.select_related('payment__entry').all():
        payment_item.cost_code = payment_item.payment.entry.cost_code
        payment_item.save(update_fields=['cost_code'])


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0007_associatedcostpaymentitem_gl_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='associatedcostentry',
            name='entry_type',
            field=models.CharField(
                choices=[('Labour', 'Labour'), ('Others', 'Others')],
                db_index=True,
                default='Labour',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='associatedcostitem',
            name='account_code',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='associatedcostitem',
            name='cost_code',
            field=models.CharField(
                choices=[
                    ('Material', 'Material'),
                    ('Machining', 'Machining'),
                    ('Coating', 'Coating'),
                    ('Consumables', 'Consumables'),
                    ('Subcontracts', 'Subcontracts'),
                    ('Labour', 'Labour'),
                    ('Freight&Customs', 'Freight&Customs'),
                    ('Prelims', 'Prelims'),
                    ('FOH', 'FOH'),
                    ('Commitments', 'Commitments'),
                    ('Contingency', 'Contingency'),
                ],
                default='FOH',
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='associatedcostitem',
            name='employee',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='associated_cost_items',
                to='employees.employee',
            ),
        ),
        migrations.AddField(
            model_name='associatedcostpaymentitem',
            name='account_code',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='associatedcostpaymentitem',
            name='cost_code',
            field=models.CharField(
                choices=[
                    ('Material', 'Material'),
                    ('Machining', 'Machining'),
                    ('Coating', 'Coating'),
                    ('Consumables', 'Consumables'),
                    ('Subcontracts', 'Subcontracts'),
                    ('Labour', 'Labour'),
                    ('Freight&Customs', 'Freight&Customs'),
                    ('Prelims', 'Prelims'),
                    ('FOH', 'FOH'),
                    ('Commitments', 'Commitments'),
                    ('Contingency', 'Contingency'),
                ],
                default='FOH',
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='associatedcostpaymentitem',
            name='employee',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='associated_cost_payment_items',
                to='employees.employee',
            ),
        ),
        migrations.RunPython(
            backfill_associated_cost_line_fields,
            migrations.RunPython.noop,
        ),
    ]
