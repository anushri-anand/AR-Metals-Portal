from django.db import models
from master_data.models import ProjectItem


class ProductionEntry(models.Model):
    project_item = models.ForeignKey(ProjectItem, on_delete=models.CASCADE, related_name='production_entries')
    date = models.DateField()
    cutting = models.IntegerField(default=0)
    grooving = models.IntegerField(default=0)
    bending = models.IntegerField(default=0)
    fabrication = models.IntegerField(default=0)
    welding = models.IntegerField(default=0)
    finishing = models.IntegerField(default=0)
    coating = models.IntegerField(default=0)
    assembly = models.IntegerField(default=0)
    installation = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project_item.item_name} - {self.date}"


class DeliveryEntry(models.Model):
    project_item = models.ForeignKey(ProjectItem, on_delete=models.CASCADE, related_name='delivery_entries')
    date = models.DateField()
    delivery_number = models.CharField(max_length=255)
    delivery_quantity = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project_item.item_name} - {self.delivery_number}"
