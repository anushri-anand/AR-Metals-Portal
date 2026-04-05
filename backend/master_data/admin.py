from django.contrib import admin
from .models import Employee, Project, ProjectItem


admin.site.register(Employee)
admin.site.register(Project)
admin.site.register(ProjectItem)
