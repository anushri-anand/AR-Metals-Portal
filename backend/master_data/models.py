from django.db import models


class Employee(models.Model):
    name = models.CharField(max_length=255)
    designation = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.designation}"


class Project(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProjectItem(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=255)
    quantity = models.IntegerField(null=True, blank=True)
    unit = models.CharField(max_length=100, null=True, blank=True)
    estimated_mh = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'item_name')

    def __str__(self):
        return f"{self.project.name} - {self.item_name}"
