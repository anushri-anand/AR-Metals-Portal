from django.contrib.auth.models import AbstractUser
from django.db import models

from .roles import ROLE_ACCOUNTANT, ROLE_CHOICES


class User(AbstractUser):
    ROLE_CHOICES = ROLE_CHOICES

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_ACCOUNTANT)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.username
