from django.db import models


class ProjectDetail(models.Model):
    project_name = models.CharField(max_length=255)
    project_number = models.CharField(max_length=100, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project_number']

    def __str__(self):
        return f'{self.project_number} - {self.project_name}'


class ProjectItem(models.Model):
    project = models.ForeignKey(
        ProjectDetail,
        on_delete=models.CASCADE,
        related_name='items',
    )

    item_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50)
    estimated_mh = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.project.project_number} - {self.item_name}'
