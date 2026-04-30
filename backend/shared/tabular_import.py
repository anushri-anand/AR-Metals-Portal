import csv
import io
import zipfile
from xml.etree import ElementTree


def parse_uploaded_table(uploaded_file):
    filename = str(getattr(uploaded_file, 'name', '')).lower()

    if filename.endswith('.csv'):
        text = uploaded_file.read().decode('utf-8-sig')
        return list(csv.reader(io.StringIO(text)))

    if filename.endswith('.xlsx'):
        return parse_xlsx_rows(uploaded_file.read())

    raise ValueError('Upload a .xlsx or .csv file.')


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


def normalize_header(value):
    return ''.join(character for character in str(value).strip().lower() if character.isalnum())


def get_header_row_and_data_rows(sheet_rows):
    for index, row in enumerate(sheet_rows):
        row_values = [str(value).strip() for value in row]

        if not any(row_values):
            continue

        if len(row_values) == 1 and row_values[0].lower().startswith('sep='):
            continue

        return row, sheet_rows[index + 1 :]

    return [], []


def get_row_value(row, index):
    if index is None or index < 0 or index >= len(row):
        return ''

    return str(row[index]).strip()
