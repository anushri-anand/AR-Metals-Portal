from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_update_user_roles'),
    ]

    operations = [
        migrations.CreateModel(
            name='ApprovalRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('request_type', models.CharField(db_index=True, max_length=100)),
                ('endpoint_path', models.CharField(max_length=255)),
                ('method', models.CharField(default='POST', max_length=10)),
                ('reject_endpoint_path', models.CharField(blank=True, default='', max_length=255)),
                ('reject_method', models.CharField(default='POST', max_length=10)),
                ('company', models.CharField(blank=True, default='', max_length=10)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('reject_payload', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], db_index=True, default='pending', max_length=20)),
                ('review_comment', models.TextField(blank=True, default='')),
                ('response_message', models.TextField(blank=True, default='')),
                ('result_data', models.JSONField(blank=True, default=dict)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('rejected_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_approval_requests', to=settings.AUTH_USER_MODEL)),
                ('submitted_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submitted_approval_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at', '-id'],
            },
        ),
    ]
