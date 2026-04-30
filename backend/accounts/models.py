from django.contrib.auth.models import AbstractUser
from django.db import models

from .roles import ROLE_ACCOUNTANT, ROLE_CHOICES


class User(AbstractUser):
    ROLE_CHOICES = ROLE_CHOICES

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_ACCOUNTANT)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username


class ApprovalRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    )

    title = models.CharField(max_length=255)
    request_type = models.CharField(max_length=100, db_index=True)
    endpoint_path = models.CharField(max_length=255)
    method = models.CharField(max_length=10, default='POST')
    reject_endpoint_path = models.CharField(max_length=255, blank=True, default='')
    reject_method = models.CharField(max_length=10, default='POST')
    company = models.CharField(max_length=10, blank=True, default='')
    payload = models.JSONField(default=dict, blank=True)
    reject_payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='submitted_approval_requests',
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='reviewed_approval_requests',
        null=True,
        blank=True,
    )
    review_comment = models.TextField(blank=True, default='')
    response_message = models.TextField(blank=True, default='')
    result_data = models.JSONField(default=dict, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.title} - {self.status}'
