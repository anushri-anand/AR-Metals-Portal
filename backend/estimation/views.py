import csv
import io
import re
import zipfile
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BoqItem, ClientData, MasterListItem, TenderLog, TenderCosting
from .serializers import (
    BoqItemSerializer,
    ClientDataSerializer,
    MasterListItemSerializer,
    TenderLogSerializer,
    save_tender_costing,
    serialize_tender_costing,
)


class ClientDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clients = ClientData.objects.all()
        serializer = ClientDataSerializer(clients, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ClientDataSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = serializer.save()
        return Response(
            ClientDataSerializer(client).data,
            status=status.HTTP_201_CREATED,
        )


class ClientDataDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        client = ClientData.objects.get(pk=pk)
        serializer = ClientDataSerializer(client, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClientDataSerializer(client).data)


class TenderLogAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenders = TenderLog.objects.select_related('client').all()
        serializer = TenderLogSerializer(tenders, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TenderLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tender = serializer.save()
        return Response(
            TenderLogSerializer(tender).data,
            status=status.HTTP_201_CREATED,
        )


class TenderLogDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        tender = TenderLog.objects.get(pk=pk)
        serializer = TenderLogSerializer(tender, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TenderLogSerializer(tender).data)


class MasterListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = MasterListItem.objects.select_related('po_ref').all()
        serializer = MasterListItemSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = MasterListItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(
            MasterListItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class MasterListDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        item = MasterListItem.objects.get(pk=pk)
        serializer = MasterListItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MasterListItemSerializer(item).data)

    def delete(self, request, pk):
        MasterListItem.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BoqItemListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = BoqItem.objects.all()
        serializer = BoqItemSerializer(items, many=True)
        return Response(serializer.data)


class BoqItemBulkSaveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rows = request.data.get('rows', [])
        serializer = BoqItemSerializer(data=rows, many=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            submitted_ids = {
                row['id']
                for row in serializer.validated_data
                if row.get('id')
            }

            if submitted_ids:
                BoqItem.objects.exclude(id__in=submitted_ids).delete()
            else:
                BoqItem.objects.all().delete()

            for row in serializer.validated_data:
                row_id = row.pop('id', None)

                if row_id:
                    BoqItem.objects.update_or_create(id=row_id, defaults=row)
                else:
                    BoqItem.objects.create(**row)

        items = BoqItem.objects.all()
        response_serializer = BoqItemSerializer(items, many=True)
        return Response(response_serializer.data)


class BoqItemImportAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {'detail': 'Please upload an Excel or CSV file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rows = parse_boq_upload(uploaded_file)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'rows': rows})


class BoqItemDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        item = BoqItem.objects.get(pk=pk)
        serializer = BoqItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BoqItemSerializer(item).data)


class TenderCostingListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        costings = TenderCosting.objects.select_related('boq_item').prefetch_related(
            'estimate_lines__item',
            'labour_lines',
        )
        return Response([serialize_tender_costing(costing) for costing in costings])


class TenderCostingDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, boq_item_id):
        try:
            costing = TenderCosting.objects.get(boq_item_id=boq_item_id)
        except TenderCosting.DoesNotExist:
            return Response(
                {'detail': 'Costing not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(serialize_tender_costing(costing))

    def post(self, request, boq_item_id):
        boq_item = BoqItem.objects.get(pk=boq_item_id)

        with transaction.atomic():
            costing = save_tender_costing(boq_item, request.data)

        return Response(serialize_tender_costing(costing))


def parse_boq_upload(uploaded_file):
    filename = uploaded_file.name.lower()

    if filename.endswith('.csv'):
        text = uploaded_file.read().decode('utf-8-sig')
        sheet_rows = list(csv.reader(io.StringIO(text)))
    elif filename.endswith('.xlsx'):
        sheet_rows = parse_xlsx_rows(uploaded_file.read())
    else:
        raise ValueError('Upload a .xlsx or .csv file.')

    return rows_to_boq_items(sheet_rows)


def parse_xlsx_rows(content):
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise ValueError('The uploaded Excel file could not be read.') from exc

    shared_strings = get_shared_strings(archive)
    sheet_path = get_first_sheet_path(archive)

    try:
        sheet_xml = archive.read(sheet_path)
    except KeyError as exc:
        raise ValueError('The uploaded Excel file has no readable worksheet.') from exc

    root = ElementTree.fromstring(sheet_xml)
    rows = []

    for row_element in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row = []

        for cell in row_element.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            reference = cell.attrib.get('r', '')
            column_index = get_column_index(reference)

            while len(row) < column_index:
                row.append('')

            row[column_index - 1] = get_cell_value(cell, shared_strings)

        rows.append(row)

    return rows


def get_shared_strings(archive):
    try:
        shared_xml = archive.read('xl/sharedStrings.xml')
    except KeyError:
        return []

    root = ElementTree.fromstring(shared_xml)
    values = []

    for item in root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
        text_parts = [
            text_element.text or ''
            for text_element in item.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        ]
        values.append(''.join(text_parts))

    return values


def get_first_sheet_path(archive):
    try:
        workbook_root = ElementTree.fromstring(archive.read('xl/workbook.xml'))
        relationship_root = ElementTree.fromstring(
            archive.read('xl/_rels/workbook.xml.rels')
        )
    except KeyError:
        return 'xl/worksheets/sheet1.xml'

    namespace = {
        'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
        'rel': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    }
    sheet = workbook_root.find('main:sheets/main:sheet', namespace)

    if sheet is None:
        return 'xl/worksheets/sheet1.xml'

    relationship_id = sheet.attrib.get(
        '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
    )

    if not relationship_id:
        return 'xl/worksheets/sheet1.xml'

    for relationship in relationship_root:
        if relationship.attrib.get('Id') == relationship_id:
            target = relationship.attrib.get('Target', 'worksheets/sheet1.xml')
            target = target.lstrip('/')

            return target if target.startswith('xl/') else f'xl/{target}'

    return 'xl/worksheets/sheet1.xml'


def get_cell_value(cell, shared_strings):
    cell_type = cell.attrib.get('t')

    if cell_type == 'inlineStr':
        text_parts = [
            text_element.text or ''
            for text_element in cell.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
        ]
        return ''.join(text_parts).strip()

    value_element = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
    value = value_element.text if value_element is not None else ''

    if cell_type == 's' and value:
        try:
            return shared_strings[int(value)].strip()
        except (IndexError, ValueError):
            return ''

    return str(value).strip()


def get_column_index(reference):
    letters = ''.join(character for character in reference if character.isalpha())

    if not letters:
        return 1

    index = 0
    for letter in letters.upper():
        index = index * 26 + ord(letter) - ord('A') + 1

    return index


def rows_to_boq_items(sheet_rows):
    header_index = find_header_index(sheet_rows)

    if header_index is None:
        raise ValueError(
            "Excel must include these columns: Client's BOQ, Item Description, Qty, Unit."
        )

    headers = [normalize_header(value) for value in sheet_rows[header_index]]
    column_map = get_column_map(headers)
    rows = []

    for raw_row in sheet_rows[header_index + 1:]:
        if not any(str(value).strip() for value in raw_row):
            continue

        rows.append(
            {
                'sn': get_row_value(raw_row, column_map.get('sn', -1)) or str(len(rows) + 1),
                'tenderNumber': '',
                'revisionNumber': '',
                'clientsBoq': get_row_value(raw_row, column_map['clientsBoq']),
                'description': get_row_value(raw_row, column_map['itemDescription']),
                'quantity': parse_number(get_row_value(raw_row, column_map['quantity'])),
                'unit': get_row_value(raw_row, column_map['unit']),
            }
        )

    if not rows:
        raise ValueError('No BOQ item rows were found in the uploaded file.')

    return rows


def find_header_index(sheet_rows):
    for index, row in enumerate(sheet_rows):
        headers = [normalize_header(value) for value in row]
        column_map = get_column_map(headers, require_all=False)

        if len(column_map) >= 3 and 'itemDescription' in column_map and 'quantity' in column_map:
            missing_fields = set(required_boq_fields()) - set(column_map)

            if missing_fields:
                raise ValueError(
                    "Excel must include these columns: Client's BOQ, Item Description, Qty, Unit."
                )

            return index

    return None


def get_column_map(headers, require_all=True):
    aliases = {
        'sn': {'sn', 'sno', 'serialno', 'serialnumber'},
        'clientsBoq': {'clientsboq', 'clientboq', 'boq', 'clientboqref'},
        'itemDescription': {'itemdescription', 'description', 'desc'},
        'quantity': {'qty', 'quantity'},
        'unit': {'unit', 'uom'},
    }
    column_map = {}

    for field, field_aliases in aliases.items():
        for index, header in enumerate(headers):
            if header in field_aliases:
                column_map[field] = index
                break

    if require_all:
        missing_fields = set(required_boq_fields()) - set(column_map)

        if missing_fields:
            raise ValueError(
                "Excel must include these columns: Client's BOQ, Item Description, Qty, Unit."
            )

    return column_map


def required_boq_fields():
    return ['clientsBoq', 'itemDescription', 'quantity', 'unit']


def normalize_header(value):
    return re.sub(r'[^a-z0-9]', '', str(value).strip().lower())


def get_row_value(row, index):
    if index < 0 or index >= len(row):
        return ''

    return str(row[index]).strip()


def parse_number(value):
    if not value:
        return 0

    cleaned_value = str(value).replace(',', '').strip()

    try:
        return float(Decimal(cleaned_value))
    except (InvalidOperation, ValueError):
        return 0
