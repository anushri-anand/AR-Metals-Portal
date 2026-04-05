from rest_framework import status, viewsets
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum
from django.core.exceptions import ValidationError
from .services import update_pending_work_entry_hours, create_work_entry
from .models import WorkEntry
from .serializers import WorkEntrySerializer
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsUserRole, IsAdminOrUserRole

class WorkEntryViewSet(viewsets.ModelViewSet):
    queryset = WorkEntry.objects.select_related(
        'employee',
        'project_item__project'
    ).all().order_by('-date', '-id')
    serializer_class = WorkEntrySerializer
    permission_classes = [IsAuthenticated, IsUserRole]

    def create(self, request, *args, **kwargs):
        try:
            work_entry = create_work_entry(
                employee_id=request.data.get('employee'),
                project_item_id=request.data.get('project_item'),
                date=request.data.get('date'),
                hours_worked=request.data.get('hours_worked'),
            )
        except ValidationError as exc:
            return Response(
                {'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(work_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PendingHoursListAPIView(ListAPIView):
    serializer_class = WorkEntrySerializer
    permission_classes = [IsAuthenticated, IsUserRole]

    def get_queryset(self):
        return WorkEntry.objects.select_related(
            'employee',
            'project_item__project'
        ).filter(
            hours_worked__isnull=True
        ).order_by('-date', '-id')


class UpdateHoursAPIView(APIView):
    permission_classes = [IsAuthenticated, IsUserRole]

    def patch(self, request, pk):
        try:
            work_entry = update_pending_work_entry_hours(
                work_entry_id=pk,
                hours_worked=request.data.get('hours_worked')
            )
        except ValidationError as exc:
            return Response(
                {'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(WorkEntrySerializer(work_entry).data)

class LabourStatusAPIView(APIView):
    permission_classes = [IsAuthenticated, IsUserRole]
    
    def get(self, request):
        queryset = WorkEntry.objects.select_related(
            'employee',
            'project_item__project'
        ).filter(
            hours_worked__isnull=False
        )

        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        employee_id = request.GET.get('employee_id')
        project_name = request.GET.get('project_name')
        item_name = request.GET.get('item_name')

        if from_date:
            queryset = queryset.filter(date__gte=from_date)

        if to_date:
            queryset = queryset.filter(date__lte=to_date)

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        if project_name:
            queryset = queryset.filter(project_item__project__name=project_name)

        if item_name:
            queryset = queryset.filter(project_item__item_name=item_name)

        queryset = queryset.order_by('-date', '-id')

        total_hours = queryset.aggregate(total=Sum('hours_worked'))['total'] or 0
        serializer = WorkEntrySerializer(queryset, many=True)

        return Response({
            'total_hours': total_hours,
            'count': queryset.count(),
            'results': serializer.data,
        })
