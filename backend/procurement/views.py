from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaymentEntry, PaymentPhase, PurchaseOrder, Vendor
from .serializers import (
    PaymentEntryCreateSerializer,
    PaymentEntrySerializer,
    PaymentEntryUpdateSerializer,
    PurchaseOrderEntrySerializer,
    PurchaseOrderSerializer,
    VendorSerializer,
)


class VendorEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VendorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = serializer.save()
        return Response(VendorSerializer(vendor).data, status=status.HTTP_201_CREATED)


class VendorListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendors = Vendor.objects.all().order_by('supplier_name')
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)


class PurchaseOrderEntryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PurchaseOrderEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supplier = Vendor.objects.get(supplier_name=data['supplier_name'])

        po_amount = data['po_amount']
        exchange_rate = data['exchange_rate']
        vat_aed = data['vat_aed']

        po_amount_aed = po_amount * exchange_rate
        po_amount_inc_vat_aed = po_amount_aed + vat_aed

        purchase_order = PurchaseOrder.objects.create(
            po_number=data['po_number'],
            project_number=data['project_number'],
            project_name=data['project_name'],
            cost_code=data['cost_code'],
            po_date_original=data['po_date_original'],
            po_date_revised=data.get('po_date_revised'),
            po_rev_number=data.get('po_rev_number', ''),
            supplier=supplier,
            item_description=data['item_description'],
            currency=data['currency'],
            po_amount=po_amount,
            exchange_rate=exchange_rate,
            po_amount_aed=po_amount_aed,
            vat_aed=vat_aed,
            po_amount_inc_vat_aed=po_amount_inc_vat_aed,
            mode_of_payment=data['mode_of_payment'],
            remarks=data.get('remarks', ''),
        )

        response_serializer = PurchaseOrderSerializer(purchase_order)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class PurchaseOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        purchase_orders = PurchaseOrder.objects.select_related('supplier').all().order_by('-po_date_original', 'po_number')
        serializer = PurchaseOrderSerializer(purchase_orders, many=True)
        return Response(serializer.data)


class PaymentEntryCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        purchase_order = PurchaseOrder.objects.get(po_number=data['po_number'])

        with transaction.atomic():
            payment_entry = PaymentEntry.objects.create(
                purchase_order=purchase_order,
                advance=data.get('advance', 0),
                delivery=data.get('delivery', 0),
                retention=data.get('retention', 0),
            )

            for index, phase in enumerate(data['phases'], start=1):
                PaymentPhase.objects.create(
                    payment_entry=payment_entry,
                    phase_number=index,
                    amount=phase['amount'],
                    due_date=phase['due_date'],
                    forecast_date=phase['forecast_date'],
                    paid=phase.get('paid', 0),
                    paid_date=phase.get('paid_date'),
                )

        return Response(
            PaymentEntrySerializer(payment_entry).data,
            status=status.HTTP_201_CREATED,
        )


class PaymentEntryListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payment_entries = PaymentEntry.objects.select_related(
            'purchase_order',
            'purchase_order__supplier',
        ).prefetch_related('phases')

        serializer = PaymentEntrySerializer(payment_entries, many=True)
        return Response(serializer.data)


class PaymentEntryUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentEntryUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment_entry = PaymentEntry.objects.get(
            purchase_order__po_number=data['po_number']
        )

        with transaction.atomic():
            for phase_data in data['phases']:
                phase = PaymentPhase.objects.get(
                    id=phase_data['id'],
                    payment_entry=payment_entry,
                )
                phase.forecast_date = phase_data['forecast_date']
                phase.paid = phase_data['paid']
                phase.paid_date = phase_data.get('paid_date')
                phase.save(update_fields=['forecast_date', 'paid', 'paid_date', 'updated_at'])

        return Response(PaymentEntrySerializer(payment_entry).data)
