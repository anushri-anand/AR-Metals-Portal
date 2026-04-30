function escapeCsvValue(value: string) {
  const normalizedValue = String(value ?? '')

  if (
    normalizedValue.includes(',') ||
    normalizedValue.includes('"') ||
    normalizedValue.includes('\n')
  ) {
    return `"${normalizedValue.replace(/"/g, '""')}"`
  }

  return normalizedValue
}

export function downloadCsvTemplate(fileName: string, headers: string[]) {
  const csvContent = `${headers.map(escapeCsvValue).join(',')}\n`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const BOQ_IMPORT_TEMPLATE_HEADERS = [
  'sn',
  'clientsBoq',
  'package',
  'itemDescription',
  'quantity',
  'unit',
  'remarks',
]

export const CLIENT_DATA_IMPORT_TEMPLATE_HEADERS = [
  'clientName',
  'customerId',
  'supplierTrnNo',
  'poBox',
  'country',
  'city',
  'contactPerson',
  'mobileNumber',
  'companyTelNumber',
  'email',
  'remarks',
]

export const TENDER_LOG_IMPORT_TEMPLATE_HEADERS = [
  'tenderNumber',
  'quoteRef',
  'revisionNumber',
  'revisionDate',
  'clientName',
  'contactName',
  'projectName',
  'projectLocation',
  'geography',
  'typeOfContract',
  'description',
  'sellingAmount',
  'tenderDate',
  'submissionDate',
  'status',
  'remarks',
]

export const MASTER_LIST_IMPORT_TEMPLATE_HEADERS = [
  'itemDescription',
  'unit',
  'rate',
  'poRefNumber',
]

export const VENDOR_DATA_IMPORT_TEMPLATE_HEADERS = [
  'supplierName',
  'vendorId',
  'trnNo',
  'poBox',
  'country',
  'city',
  'contactPersonName',
  'mobileNumber',
  'email',
  'companyTelephone',
  'productDetails',
  'review',
]
