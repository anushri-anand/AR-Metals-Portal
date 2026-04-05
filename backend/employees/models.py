from django.db import models
from master_data.models import Employee, ProjectItem


class WorkEntry(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='work_entries')
    project_item = models.ForeignKey(ProjectItem, on_delete=models.CASCADE, related_name='work_entries')
    date = models.DateField()
    hours_worked = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.name} - {self.project_item.item_name} - {self.date}"
