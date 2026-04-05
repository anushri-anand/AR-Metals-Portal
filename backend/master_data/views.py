from rest_framework import viewsets
from .models import Employee, Project, ProjectItem
from .serializers import EmployeeSerializer, ProjectSerializer, ProjectItemSerializer
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminRole, IsAdminOrReadOnlyForAppUsers

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('name')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    permission_classes = [IsAuthenticated, IsAdminOrReadOnlyForAppUsers]


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('name')
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    permission_classes = [IsAuthenticated, IsAdminOrReadOnlyForAppUsers]


class ProjectItemViewSet(viewsets.ModelViewSet):
    queryset = ProjectItem.objects.select_related('project').all().order_by('project__name', 'item_name')
    serializer_class = ProjectItemSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    permission_classes = [IsAuthenticated, IsAdminOrReadOnlyForAppUsers]
