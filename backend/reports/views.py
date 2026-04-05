from django.db.models import Sum
from rest_framework.response import Response
from rest_framework.views import APIView
from master_data.models import ProjectItem
from employees.models import WorkEntry
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdminOrUserRole


class AnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrUserRole]

    def get(self, request):
        project_name = request.GET.get('project_name')
        item_name = request.GET.get('item_name')
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')

        if not project_name or not item_name:
            return Response({
                'message': 'project_name and item_name are required.',
                'results': None
            })

        try:
            project_item = ProjectItem.objects.select_related('project').get(
                project__name=project_name,
                item_name=item_name
            )
        except ProjectItem.DoesNotExist:
            return Response({
                'message': 'Project item not found.',
                'results': None
            })

        production_entries = project_item.production_entries.all()
        delivery_entries = project_item.delivery_entries.all()
        work_entries = project_item.work_entries.filter(hours_worked__isnull=False)

        if from_date:
            production_entries = production_entries.filter(date__gte=from_date)
            delivery_entries = delivery_entries.filter(date__gte=from_date)
            work_entries = work_entries.filter(date__gte=from_date)

        if to_date:
            production_entries = production_entries.filter(date__lte=to_date)
            delivery_entries = delivery_entries.filter(date__lte=to_date)
            work_entries = work_entries.filter(date__lte=to_date)

        totals = {
            'Cutting': production_entries.aggregate(total=Sum('cutting'))['total'] or 0,
            'Grooving': production_entries.aggregate(total=Sum('grooving'))['total'] or 0,
            'Bending': production_entries.aggregate(total=Sum('bending'))['total'] or 0,
            'Fabrication': production_entries.aggregate(total=Sum('fabrication'))['total'] or 0,
            'Welding': production_entries.aggregate(total=Sum('welding'))['total'] or 0,
            'Finishing': production_entries.aggregate(total=Sum('finishing'))['total'] or 0,
            'Coating': production_entries.aggregate(total=Sum('coating'))['total'] or 0,
            'Assembly': production_entries.aggregate(total=Sum('assembly'))['total'] or 0,
            'Installation': production_entries.aggregate(total=Sum('installation'))['total'] or 0,
            'Delivery': delivery_entries.aggregate(total=Sum('delivery_quantity'))['total'] or 0,
        }

        actual_total_mh = work_entries.aggregate(total=Sum('hours_worked'))['total'] or 0

        filtered_totals = {key: value for key, value in totals.items() if value != 0}

        return Response({
            'project_name': project_item.project.name,
            'item_name': project_item.item_name,
            'total_quantity': project_item.quantity,
            'estimated_mh': project_item.estimated_mh,
            'actual_total_mh': actual_total_mh,
            'totals': filtered_totals,
        })


class MHCostAllocationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrUserRole]

    def get(self, request):
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')

        work_entries = WorkEntry.objects.select_related(
            'employee',
            'project_item__project'
        ).filter(hours_worked__isnull=False)

        if from_date:
            work_entries = work_entries.filter(date__gte=from_date)

        if to_date:
            work_entries = work_entries.filter(date__lte=to_date)

        employees = {}
        projects = set()

        for entry in work_entries:
            employee_id = entry.employee.id
            employee_name = entry.employee.name
            project_name = entry.project_item.project.name
            hours = entry.hours_worked or 0

            projects.add(project_name)

            if employee_id not in employees:
                employees[employee_id] = {
                    'employee_name': employee_name,
                    'total_hours': 0,
                    'projects': {}
                }

            employees[employee_id]['total_hours'] += hours
            employees[employee_id]['projects'][project_name] = (
                employees[employee_id]['projects'].get(project_name, 0) + hours
            )

        sorted_projects = sorted(projects)
        allocation_rows = []

        for employee_data in employees.values():
            total_hours = employee_data['total_hours']
            percentages = {}

            for project in sorted_projects:
                project_hours = employee_data['projects'].get(project, 0)
                percentage = (project_hours / total_hours * 100) if total_hours > 0 else 0
                percentages[project] = f"{percentage:.2f}%"

            allocation_rows.append({
                'employee_name': employee_data['employee_name'],
                'percentages': percentages
            })

        return Response({
            'projects': sorted_projects,
            'allocation_rows': allocation_rows,
        })
