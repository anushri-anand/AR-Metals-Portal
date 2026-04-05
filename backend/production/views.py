from .models import ProductionEntry, DeliveryEntry
from .serializers import ProductionEntrySerializer, DeliveryEntrySerializer
from django.db.models import Sum
from rest_framework.response import Response
from rest_framework.views import APIView
from master_data.models import ProjectItem
from django.core.exceptions import ValidationError
from .services import create_production_entry, create_delivery_entry
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsUserRole, IsAdminOrUserRole
from rest_framework import status, viewsets


class ProductionEntryViewSet(viewsets.ModelViewSet):
    queryset = ProductionEntry.objects.select_related(
        'project_item__project'
    ).all().order_by('-date', '-id')
    serializer_class = ProductionEntrySerializer
    permission_classes = [IsAuthenticated, IsUserRole]

    def create(self, request, *args, **kwargs):
        try:
            production_entry = create_production_entry(
                project_item_id=request.data.get('project_item'),
                date=request.data.get('date'),
                data=request.data,
            )
        except ValidationError as exc:
            return Response(
                {'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST
            )

        production_entry.refresh_from_db()
        serializer = self.get_serializer(production_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DeliveryEntryViewSet(viewsets.ModelViewSet):
    queryset = DeliveryEntry.objects.select_related(
        'project_item__project'
    ).all().order_by('-date', '-id')
    serializer_class = DeliveryEntrySerializer
    permission_classes = [IsAuthenticated, IsUserRole]

    def create(self, request, *args, **kwargs):
        try:
            delivery_entry = create_delivery_entry(
                project_item_id=request.data.get('project_item'),
                date=request.data.get('date'),
                delivery_number=request.data.get('delivery_number'),
                delivery_quantity=request.data.get('delivery_quantity'),
            )
        except ValidationError as exc:
            return Response(
                {'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST
            )

        delivery_entry.refresh_from_db()
        serializer = self.get_serializer(delivery_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ProductionStatusAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrUserRole]

    def get(self, request):
        queryset = ProjectItem.objects.select_related('project').all()

        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        project_name = request.GET.get('project_name')
        item_name = request.GET.get('item_name')

        if project_name:
            queryset = queryset.filter(project__name=project_name)

        if item_name:
            queryset = queryset.filter(item_name=item_name)

        rows = []

        for item in queryset:
            production_entries = item.production_entries.all()
            delivery_entries = item.delivery_entries.all()

            if from_date:
                production_entries = production_entries.filter(date__gte=from_date)
                delivery_entries = delivery_entries.filter(date__gte=from_date)

            if to_date:
                production_entries = production_entries.filter(date__lte=to_date)
                delivery_entries = delivery_entries.filter(date__lte=to_date)

            cutting = production_entries.aggregate(total=Sum('cutting'))['total'] or 0
            grooving = production_entries.aggregate(total=Sum('grooving'))['total'] or 0
            bending = production_entries.aggregate(total=Sum('bending'))['total'] or 0
            fabrication = production_entries.aggregate(total=Sum('fabrication'))['total'] or 0
            welding = production_entries.aggregate(total=Sum('welding'))['total'] or 0
            finishing = production_entries.aggregate(total=Sum('finishing'))['total'] or 0
            coating = production_entries.aggregate(total=Sum('coating'))['total'] or 0
            assembly = production_entries.aggregate(total=Sum('assembly'))['total'] or 0
            installation = production_entries.aggregate(total=Sum('installation'))['total'] or 0
            delivery_total = delivery_entries.aggregate(total=Sum('delivery_quantity'))['total'] or 0

            if (
                cutting == 0 and grooving == 0 and bending == 0 and fabrication == 0 and
                welding == 0 and finishing == 0 and coating == 0 and assembly == 0 and
                installation == 0 and delivery_total == 0
            ):
                continue

            rows.append({
                'project_name': item.project.name,
                'item_name': item.item_name,
                'quantity': item.quantity,
                'unit': item.unit,
                'cutting': cutting,
                'grooving': grooving,
                'bending': bending,
                'fabrication': fabrication,
                'welding': welding,
                'finishing': finishing,
                'coating': coating,
                'assembly': assembly,
                'delivery_total': delivery_total,
                'installation': installation,
            })

        totals = {
            'cutting': sum(row['cutting'] for row in rows),
            'grooving': sum(row['grooving'] for row in rows),
            'bending': sum(row['bending'] for row in rows),
            'fabrication': sum(row['fabrication'] for row in rows),
            'welding': sum(row['welding'] for row in rows),
            'finishing': sum(row['finishing'] for row in rows),
            'coating': sum(row['coating'] for row in rows),
            'assembly': sum(row['assembly'] for row in rows),
            'delivery': sum(row['delivery_total'] for row in rows),
            'installation': sum(row['installation'] for row in rows),
        }

        return Response({
            'count': len(rows),
            'totals': totals,
            'results': rows,
        })
