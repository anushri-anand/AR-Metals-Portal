from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('user_1', 'User 1'),
        ('user_2', 'User 2'),
        ('admin', 'Admin'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user_1')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
