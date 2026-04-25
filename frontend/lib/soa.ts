import {
  ClientData,
  ContractPaymentLog,
  TenderLog,
} from '@/lib/estimation-storage'

export type SoaVendorRecord = {
  id: number
  supplier_name: string
  country: string
  city: string
}

export type SoaProcurementPaymentPhase = {
  phase_number?: number
  amount?: string | number
  due_date?: string | null
  paid_inc_vat?: string | number
  invoice_no?: string
  invoice_date?: string | null
}

export type SoaProcurementPaymentRecord = {
  id: number
  po_number: string
  supplier_name?: string
  phases?: SoaProcurementPaymentPhase[]
}

export type SoaAssociatedCostPaymentItem = {
  line_number: number
  received_quantity?: string | number
  rate?: string | number
  actual_incurred_cost?: string | number
  invoice_number?: string
  invoice_date?: string | null
}

export type SoaAssociatedCostPaymentRecord = {
  id: number
  serial_number: string
  supplier_name?: string
  delivery_items?: SoaAssociatedCostPaymentItem[]
}

export type ClientSoaRow = {
  sn: number
  invoiceDate: string
  invoiceNumber: string
  projectName: string
  contractRef: string
  invoiceAmount: number
  received: number
  balanceReceivable: number
  dueDate: string
  overDue: number
}

export type SupplierSoaRow = {
  sn: number
  invoiceDate: string
  invoiceNumber: string
  poNumber: string
  invoiceAmount: number
  paid: number
  balancePayable: number
  dueDate: string
  overDue: number
}

export function buildClientSoaRows({
  clientName,
  contractPaymentLogs,
  tenderLogs,
  today,
}: {
  clientName: string
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  today: string
}) {
  const tenderByProjectName = new Map(
    tenderLogs.map((tender) => [tender.projectName, tender] as const)
  )

  return contractPaymentLogs
    .flatMap((log) => {
      const tender = tenderByProjectName.get(log.projectName)
      if (!tender || tender.clientName !== clientName) {
        return []
      }

      const invoiceAmount = toNumber(log.netApprovedIncVat)
      const received = toNumber(log.paidAmount)
      const balanceReceivable = Math.max(invoiceAmount - received, 0)

      if (balanceReceivable <= 0) {
        return []
      }

      const dueDate = log.dueDate || ''

      return [
        {
          sn: 0,
          invoiceDate: log.approvedDate || log.submittedDate || '',
          invoiceNumber: String(log.sn || ''),
          projectName: log.projectName || '',
          contractRef: tender.quoteRef || '-',
          invoiceAmount,
          received,
          balanceReceivable,
          dueDate,
          overDue: getOverdueDays(dueDate, today),
        } satisfies ClientSoaRow,
      ]
    })
    .sort((left, right) => {
      if (left.invoiceDate !== right.invoiceDate) {
        return left.invoiceDate.localeCompare(right.invoiceDate)
      }

      return left.invoiceNumber.localeCompare(right.invoiceNumber)
    })
    .map((row, index) => ({
      ...row,
      sn: index + 1,
    }))
}

export function buildSupplierSoaRows({
  supplierName,
  procurementPayments,
  associatedCostPayments,
  today,
}: {
  supplierName: string
  procurementPayments: SoaProcurementPaymentRecord[]
  associatedCostPayments: SoaAssociatedCostPaymentRecord[]
  today: string
}) {
  const procurementRows = procurementPayments.flatMap((payment) => {
    if (String(payment.supplier_name || '').trim() !== supplierName) {
      return []
    }

    return (payment.phases || []).flatMap((phase) => {
      const invoiceAmount = toNumber(phase.amount)
      const paid = toNumber(phase.paid_inc_vat)
      const balancePayable = Math.max(invoiceAmount - paid, 0)

      if (balancePayable <= 0) {
        return []
      }

      const dueDate = phase.due_date || ''

      return [
        {
          sn: 0,
          invoiceDate: phase.invoice_date || '',
          invoiceNumber: String(phase.invoice_no || phase.phase_number || ''),
          poNumber: payment.po_number || '',
          invoiceAmount,
          paid,
          balancePayable,
          dueDate,
          overDue: getOverdueDays(dueDate, today),
        } satisfies SupplierSoaRow,
      ]
    })
  })

  const associatedCostRows = associatedCostPayments.flatMap((payment) => {
    if (String(payment.supplier_name || '').trim() !== supplierName) {
      return []
    }

    return (payment.delivery_items || []).flatMap((item) => {
      const invoiceAmount =
        toNumber(item.actual_incurred_cost) ||
        toNumber(item.received_quantity) * toNumber(item.rate)
      const balancePayable = Math.max(invoiceAmount, 0)

      if (balancePayable <= 0) {
        return []
      }

      return [
        {
          sn: 0,
          invoiceDate: item.invoice_date || '',
          invoiceNumber: String(item.invoice_number || item.line_number || ''),
          poNumber: payment.serial_number || '',
          invoiceAmount,
          paid: 0,
          balancePayable,
          dueDate: '',
          overDue: 0,
        } satisfies SupplierSoaRow,
      ]
    })
  })

  return [...procurementRows, ...associatedCostRows]
    .sort((left, right) => {
      if (left.invoiceDate !== right.invoiceDate) {
        return left.invoiceDate.localeCompare(right.invoiceDate)
      }

      return left.invoiceNumber.localeCompare(right.invoiceNumber)
    })
    .map((row, index) => ({
      ...row,
      sn: index + 1,
    }))
}

export function formatSoaDate(value: string) {
  if (!value) {
    return '-'
  }

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const day = Number(dayText)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return '-'
  }

  const date = new Date(year, month, day)
  const monthLabel = date.toLocaleString('en-US', { month: 'short' })
  return `${String(day).padStart(2, '0')}.${monthLabel}.${String(year).slice(-2)}`
}

export function formatSoaMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getTodayIsoDate() {
  return new Date().toLocaleDateString('en-CA')
}

export function getClientLocation(client: ClientData | null) {
  if (!client) {
    return ''
  }

  return [client.city, client.country].filter(Boolean).join(', ')
}

export function getVendorLocation(vendor: SoaVendorRecord | null) {
  if (!vendor) {
    return ''
  }

  return [vendor.city, vendor.country].filter(Boolean).join(', ')
}

function getOverdueDays(dueDate: string, today: string) {
  if (!dueDate || !today || dueDate >= today) {
    return 0
  }

  const due = new Date(`${dueDate}T00:00:00`)
  const current = new Date(`${today}T00:00:00`)
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.max(
    Math.floor((current.getTime() - due.getTime()) / millisecondsPerDay),
    0
  )
}

function toNumber(value: unknown) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}
