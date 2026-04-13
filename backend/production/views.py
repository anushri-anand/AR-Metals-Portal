from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProjectDetail, ProjectItem
from .serializers import (
    ProjectDetailCreateSerializer,
    ProjectDetailSerializer,
    ProjectDetailUpdateSerializer,
)


class ProjectOptionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = ProjectDetail.objects.all().order_by('project_number')
        serializer = ProjectDetailSerializer(projects, many=True)
        return Response(serializer.data)


class ProjectDetailEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProjectDetailCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            project = ProjectDetail.objects.create(
                project_name=data['project_name'],
                project_number=data['project_number'],
            )

            for item in data['items']:
                ProjectItem.objects.create(
                    project=project,
                    item_name=item['item_name'],
                    quantity=item['quantity'],
                    unit=item['unit'],
                    estimated_mh=item['estimated_mh'],
                )

        response_serializer = ProjectDetailSerializer(project)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ProjectDetailListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_number = request.query_params.get('project_number')

        projects = ProjectDetail.objects.prefetch_related('items').all()

        if project_number:
            projects = projects.filter(project_number=project_number)

        projects = projects.order_by('project_number')
        serializer = ProjectDetailSerializer(projects, many=True)
        return Response(serializer.data)


class ProjectDetailUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProjectDetailUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        project = ProjectDetail.objects.get(project_number=data['project_number'])

        with transaction.atomic():
            for item_data in data['items']:
                item = ProjectItem.objects.get(id=item_data['id'], project=project)
                item.quantity = item_data['quantity']
                item.unit = item_data['unit']
                item.estimated_mh = item_data['estimated_mh']
                item.save(update_fields=['quantity', 'unit', 'estimated_mh', 'updated_at'])

        response_serializer = ProjectDetailSerializer(project)
        return Response(response_serializer.data)
