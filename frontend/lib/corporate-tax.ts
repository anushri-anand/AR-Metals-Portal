import { fohAccountCodeOptions } from '@/lib/account-codes'
import { CompanyName } from '@/lib/company'
import { ClientData, ContractPaymentLog, TenderLog } from '@/lib/estimation-storage'
import { formatVatDateLabel } from '@/lib/vat-summary'

export type CorporateTaxProjectOption = {
  id: number
  project_number: string
  project_name: string
  tender_number?: string
}

export type CorporateTaxPurchaseItem = {
  line_number: number
  item_description?: string
  account_code?: string
  quantity?: string | number
  unit?: string
  currency?: string
  exchange_rate?: string | number
  source_rate?: string | number
  rate?: string | number
  source_amount?: string | number
  amount?: string | number
  amount_aed?: string | number
  depreciation_start_date?: string
  depreciation_end_date?: string
}

export type CorporateTaxPurchaseOrderRecord = {
  id: number
  order_type: 'project' | 'asset' | 'inventory'
  status?: string
  po_number: string
  project_number: string
  project_name: string
  cost_code: string
  supplier_name: string
  purchase_items?: CorporateTaxPurchaseItem[]
}

export type CorporateTaxPaymentDeliveryItem = {
  id?: number
  line_number: number
  item_description?: string
  quantity?: string | number
  unit?: string
  rate?: string | number
  received_quantity?: string | number
  actual_incurred_cost?: string | number
}

export type CorporateTaxPaymentPhase = {
  id?: number
  phase_number?: number
  paid_inc_vat?: string | number
  paid_exc_vat?: string | number
  vat?: string | number
  invoice_no?: string
  invoice_date?: string | null
  gl_date?: string | null
}

export type CorporateTaxPaymentEntryRecord = {
  id: number
  po_number: string
  supplier_name?: string
  phases?: CorporateTaxPaymentPhase[]
  delivery_items?: CorporateTaxPaymentDeliveryItem[]
}

export type CorporateTaxInventoryIssuanceRecord = {
  id: number
  po_number: string
  supplier_name?: string
  issuance_date: string
  project_name: string
  project_number: string
  cost_code: string
  line_number: number
  item_description: string
  unit: string
  quantity_issued: string | number
  rate: string | number
  amount: string | number
}

export type CorporateTaxPettyCashVoucherItem = {
  id: number
  line_number?: number
  item: string
  account_code?: string
  project_name: string
  project_number: string
  cost_code: string
  quantity: string | number
  unit: string
  rate: string | number
  amount_exc_vat: string | number
  invoice_number?: string
  invoice_date?: string | null
  supplier_name?: string
}

export type CorporateTaxPettyCashVoucher = {
  id: number
  voucher_number: string
  items: CorporateTaxPettyCashVoucherItem[]
}

export type CorporateTaxAssociatedCostItem = {
  line_number: number
  employee_id?: string | null
  employee_name?: string | null
  account_code?: string
  cost_code?: string
  item_description: string
  quantity: string | number
  unit: string
  rate: string | number
  amount: string | number
  start_date: string
  end_date: string
}

export type CorporateTaxAssociatedCostEntryRecord = {
  id: number
  serial_number: string
  entry_type?: 'Labour' | 'Others'
  supplier_name: string
  date: string
  cost_code: string
  items: CorporateTaxAssociatedCostItem[]
}

export type CorporateTaxTimeAllocationLine = {
  id: number
  date: string
  employee_id: string
  employee_name: string
  cost_code?: string
  account_code?: string
  project_number: string
  project_name: string
  variation_number: string
  boq_sn: string
  item_name: string
  percentage: string | number
}

export type CorporateTaxSalaryActualIncurredCostRow = {
  sn: number
  date: string
  employee_name: string
  employee_id: string
  project_name: string
  project_number: string
  contribution_percentage: string | number
  cost_code: string
  item_description: string
  amount: string | number
}

export type CorporateTaxRevenueRow = {
  sn: number
  invoiceDate: string
  customerName: string
  invoiceNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

export type CorporateTaxPurchaseRow = {
  sn: number
  groupLabel: string
  glDate: string
  supplierName: string
  invoiceDate: string
  invoiceNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

export type CorporateTaxSummary = {
  projectsRevenue: number
  otherRevenue: number
  revenueTotal: number
  directCostTotals: Record<string, number>
  indirectCostTotals: Record<string, number>
  directCostTotal: number
  indirectCostTotal: number
  totalCost: number
  netProfitOrLoss: number
}

export type CorporateTaxDetailCategory = 'revenue' | 'direct-cost' | 'indirect-cost'

export type CorporateTaxCostData = {
  purchaseOrders: CorporateTaxPurchaseOrderRecord[]
  paymentEntries: CorporateTaxPaymentEntryRecord[]
  inventoryIssuances: CorporateTaxInventoryIssuanceRecord[]
  pettyCashVouchers: CorporateTaxPettyCashVoucher[]
  associatedCostEntries: CorporateTaxAssociatedCostEntryRecord[]
  timeAllocationLines: CorporateTaxTimeAllocationLine[]
  salaryActualIncurredRows: CorporateTaxSalaryActualIncurredCostRow[]
}

type CorporateTaxCostSourceRow = {
  groupLabel: string
  glDate: string
  supplierName: string
  invoiceDate: string
  invoiceNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

const DIRECT_COST_LABEL_BY_CODE: Record<string, string> = {
  Material: 'Material',
  Machining: 'Machining',
  Coating: 'Coating',
  Consumables: 'Consumables',
  Subcontracts: 'Subcontracts',
  Labour: 'Production Labour',
  'Production Labour': 'Production Labour',
  'Installation Labour': 'Installation Labour',
  'Freight&Customs': 'Freight & Customs',
  Prelims: 'Prelims',
}

export const directCostCategoryOrder = [
  'Material',
  'Machining',
  'Coating',
  'Consumables',
  'Subcontracts',
  'Production Labour',
  'Freight & Customs',
  'Installation Labour',
  'Prelims',
] as const

export const indirectCostCategoryOrder = [...fohAccountCodeOptions].sort((left, right) =>
  left.localeCompare(right)
)

export function getCorporateTaxCompanyDisplayName(company: CompanyName | null) {
  if (company === 'AKR') {
    return 'AKR METAL INDUSTRIAL LLC'
  }

  return 'AL RIYADA METAL INDUSTRIAL LLC SP'
}

export function formatCorporateTaxDateLabel(value: string) {
  return formatVatDateLabel(value)
}

export function buildCorporateTaxRevenueRegister({
  fromDate,
  toDate,
  contractPaymentLogs,
  tenderLogs,
  clientData,
  projectOptions,
}: {
  fromDate: string
  toDate: string
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: CorporateTaxProjectOption[]
}) {
  const tenderByNumber = new Map(
    tenderLogs.map((tender) => [tender.tenderNumber, tender] as const)
  )
  const clientByName = new Map(
    clientData.map((client) => [client.clientName, client] as const)
  )
  const projectByNumber = new Map(
    projectOptions.map((project) => [project.project_number, project] as const)
  )

  return contractPaymentLogs
    .filter((payment) => isDateInRange(payment.approvedDate, fromDate, toDate))
    .map((payment) => {
      const project = projectByNumber.get(payment.projectNumber)
      const tender = project?.tender_number
        ? tenderByNumber.get(project.tender_number)
        : tenderLogs.find((item) => item.projectName === payment.projectName)
      const customer = tender?.clientName
        ? clientByName.get(tender.clientName)
        : undefined
      const taxableAmount = toNumber(payment.grossApprovedAmount)
      const vatPercent = toNumber(payment.approvedVat)
      const vatAmount = toNumber(payment.approvedVatAmount)

      return {
        sn: 0,
        invoiceDate: payment.approvedDate || '',
        customerName: tender?.clientName || customer?.clientName || payment.projectName || '-',
        invoiceNumber: String(payment.sn || ''),
        taxableAmount,
        vatPercent,
        vatAmount,
        amountIncVat: taxableAmount + vatAmount,
      } satisfies CorporateTaxRevenueRow
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

export function buildCorporateTaxDirectCostRegister({
  fromDate,
  toDate,
  costData,
}: {
  fromDate: string
  toDate: string
  costData: CorporateTaxCostData
}) {
  return buildCorporateTaxCostRows({
    fromDate,
    toDate,
    costData,
    targetCategory: 'direct-cost',
  })
}

export function buildCorporateTaxIndirectCostRegister({
  fromDate,
  toDate,
  costData,
}: {
  fromDate: string
  toDate: string
  costData: CorporateTaxCostData
}) {
  return buildCorporateTaxCostRows({
    fromDate,
    toDate,
    costData,
    targetCategory: 'indirect-cost',
  })
}

export function buildCorporateTaxSummary({
  revenueRows,
  directCostRows,
  indirectCostRows,
}: {
  revenueRows: CorporateTaxRevenueRow[]
  directCostRows: CorporateTaxPurchaseRow[]
  indirectCostRows: CorporateTaxPurchaseRow[]
}): CorporateTaxSummary {
  const directCostTotals = Object.fromEntries(
    directCostCategoryOrder.map((label) => [label, 0])
  ) as Record<string, number>
  const indirectCostTotals = Object.fromEntries(
    indirectCostCategoryOrder.map((label) => [label, 0])
  ) as Record<string, number>

  for (const row of directCostRows) {
    directCostTotals[row.groupLabel] =
      (directCostTotals[row.groupLabel] || 0) + row.taxableAmount
  }

  for (const row of indirectCostRows) {
    indirectCostTotals[row.groupLabel] =
      (indirectCostTotals[row.groupLabel] || 0) + row.taxableAmount
  }

  const projectsRevenue = revenueRows.reduce(
    (total, row) => total + row.taxableAmount,
    0
  )
  const otherRevenue = 0
  const revenueTotal = projectsRevenue + otherRevenue
  const directCostTotal = Object.values(directCostTotals).reduce(
    (total, value) => total + value,
    0
  )
  const indirectCostTotal = Object.values(indirectCostTotals).reduce(
    (total, value) => total + value,
    0
  )
  const totalCost = directCostTotal + indirectCostTotal

  return {
    projectsRevenue,
    otherRevenue,
    revenueTotal,
    directCostTotals,
    indirectCostTotals,
    directCostTotal,
    indirectCostTotal,
    totalCost,
    netProfitOrLoss: revenueTotal - totalCost,
  }
}

function buildCorporateTaxCostRows({
  fromDate,
  toDate,
  costData,
  targetCategory,
}: {
  fromDate: string
  toDate: string
  costData: CorporateTaxCostData
  targetCategory: 'direct-cost' | 'indirect-cost'
}) {
  const sourceRows = buildCorporateTaxCostSourceRows(costData)
  const groupedRows: CorporateTaxCostSourceRow[] = []

  for (const row of sourceRows) {
    const filterDate = row.glDate || row.invoiceDate
    if (!isDateInRange(filterDate, fromDate, toDate)) {
      continue
    }

    const normalized = normalizeCorporateTaxCostRow(row, targetCategory)
    if (normalized) {
      groupedRows.push(normalized)
    }
  }

  return groupedRows
    .sort((left, right) => {
      const leftIndex =
        targetCategory === 'direct-cost'
          ? directCostCategoryOrder.indexOf(left.groupLabel as (typeof directCostCategoryOrder)[number])
          : indirectCostCategoryOrder.indexOf(left.groupLabel as (typeof indirectCostCategoryOrder)[number])
      const rightIndex =
        targetCategory === 'direct-cost'
          ? directCostCategoryOrder.indexOf(right.groupLabel as (typeof directCostCategoryOrder)[number])
          : indirectCostCategoryOrder.indexOf(right.groupLabel as (typeof indirectCostCategoryOrder)[number])

      if (leftIndex !== rightIndex) {
        if (leftIndex === -1) return 1
        if (rightIndex === -1) return -1
        return leftIndex - rightIndex
      }

      const leftDate = left.glDate || left.invoiceDate
      const rightDate = right.glDate || right.invoiceDate
      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate)
      }

      if (left.supplierName !== right.supplierName) {
        return left.supplierName.localeCompare(right.supplierName)
      }

      return left.invoiceNumber.localeCompare(right.invoiceNumber)
    })
    .map((row, index) => ({
      ...row,
      sn: index + 1,
    }))
}

function normalizeCorporateTaxCostRow(
  row: CorporateTaxCostSourceRow & {
    rawCostCode: string
    rawAccountCode: string
  },
  targetCategory: 'direct-cost' | 'indirect-cost'
) {
  const normalizedCostCode = String(row.rawCostCode || '').trim()
  const normalizedAccountCode = String(row.rawAccountCode || '').trim()

  if (targetCategory === 'direct-cost') {
    const groupLabel = DIRECT_COST_LABEL_BY_CODE[normalizedCostCode]
    if (!groupLabel) {
      return null
    }

    return {
      ...row,
      groupLabel,
    }
  }

  if (normalizedCostCode !== 'FOH') {
    return null
  }

  const groupLabel = normalizedAccountCode || 'Miscellaneous'

  return {
    ...row,
    groupLabel,
  }
}

function buildCorporateTaxCostSourceRows(costData: CorporateTaxCostData) {
  const rows: Array<
    CorporateTaxCostSourceRow & {
      rawCostCode: string
      rawAccountCode: string
    }
  > = []
  const purchaseOrderByNumber = new Map(
    costData.purchaseOrders.map((order) => [order.po_number, order] as const)
  )

  rows.push(...buildProjectPurchaseCostRows(costData.purchaseOrders, costData.paymentEntries))
  rows.push(...buildAssetCostRows(costData.purchaseOrders))
  rows.push(...buildInventoryCostRows(costData.inventoryIssuances, purchaseOrderByNumber))
  rows.push(...buildPettyCashCostRows(costData.pettyCashVouchers))
  rows.push(
    ...buildAssociatedCostRows(
      costData.associatedCostEntries,
      costData.timeAllocationLines
    )
  )
  rows.push(...buildSalaryCostRows(costData.salaryActualIncurredRows))

  return rows
}

function buildProjectPurchaseCostRows(
  purchaseOrders: CorporateTaxPurchaseOrderRecord[],
  paymentEntries: CorporateTaxPaymentEntryRecord[]
) {
  const purchaseOrderByNumber = new Map(
    purchaseOrders
      .filter((order) => order.order_type === 'project')
      .map((order) => [order.po_number, order] as const)
  )

  return paymentEntries.flatMap((entry) => {
    const purchaseOrder = purchaseOrderByNumber.get(entry.po_number)
    if (!purchaseOrder) {
      return []
    }

    const primaryPhase = getPrimaryPaymentPhase(entry.phases || [])

    return (entry.delivery_items || []).flatMap((item) => {
      const quantity = toNumber(item.received_quantity)
      const rate = toNumber(item.rate)
      const amount =
        toNumber(item.actual_incurred_cost) || quantity * rate

      if (amount <= 0 && quantity <= 0) {
        return []
      }

      const purchaseItem = findPurchaseItemByLineNumber(
        purchaseOrder.purchase_items || [],
        item.line_number
      )

      return [
        {
          groupLabel: '',
          rawCostCode: purchaseOrder.cost_code || '',
          rawAccountCode: String(purchaseItem?.account_code || '').trim() || purchaseOrder.cost_code || '',
          glDate: primaryPhase?.gl_date || primaryPhase?.invoice_date || '',
          supplierName:
            String(entry.supplier_name || purchaseOrder.supplier_name || '').trim() || '-',
          invoiceDate: primaryPhase?.invoice_date || '',
          invoiceNumber: String(primaryPhase?.invoice_no || purchaseOrder.po_number || '-'),
          taxableAmount: amount,
          vatPercent: 0,
          vatAmount: 0,
          amountIncVat: amount,
        },
      ]
    })
  })
}

function buildAssetCostRows(purchaseOrders: CorporateTaxPurchaseOrderRecord[]) {
  return purchaseOrders
    .filter((order) => order.order_type === 'asset')
    .flatMap((order) =>
      (order.purchase_items || []).flatMap((item) => {
        const startDate = parseISODate(item.depreciation_start_date || '')
        const endDate = parseISODate(item.depreciation_end_date || '')

        if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
          return []
        }

        const totalDays = getInclusiveDayCount(startDate, endDate)
        if (totalDays <= 0) {
          return []
        }

        const totalAmount = toNumber(item.amount) || toNumber(item.quantity) * toNumber(item.rate)
        const dailyRate = totalAmount / totalDays

        return buildMonthlySegments(startDate, endDate).map((segment) => {
          const amount = segment.days * dailyRate

          return {
            groupLabel: '',
            rawCostCode: order.cost_code || '',
            rawAccountCode: String(item.account_code || '').trim() || order.cost_code || '',
            glDate: segment.date,
            supplierName: String(order.supplier_name || '').trim() || '-',
            invoiceDate: segment.date,
            invoiceNumber: order.po_number || '-',
            taxableAmount: amount,
            vatPercent: 0,
            vatAmount: 0,
            amountIncVat: amount,
          }
        })
      })
    )
}

function buildInventoryCostRows(
  inventoryIssuances: CorporateTaxInventoryIssuanceRecord[],
  purchaseOrderByNumber: Map<string, CorporateTaxPurchaseOrderRecord>
) {
  return inventoryIssuances.flatMap((issuance) => {
    const purchaseOrder = purchaseOrderByNumber.get(issuance.po_number)
    const purchaseItem = purchaseOrder
      ? findPurchaseItemByLineNumber(purchaseOrder.purchase_items || [], issuance.line_number)
      : null
    const amount = toNumber(issuance.amount)

    if (amount <= 0 && toNumber(issuance.quantity_issued) <= 0) {
      return []
    }

    return [
      {
        groupLabel: '',
        rawCostCode: issuance.cost_code || purchaseOrder?.cost_code || '',
        rawAccountCode:
          String(purchaseItem?.account_code || '').trim() ||
          issuance.cost_code ||
          purchaseOrder?.cost_code ||
          '',
        glDate: issuance.issuance_date || '',
        supplierName: String(issuance.supplier_name || purchaseOrder?.supplier_name || '').trim() || '-',
        invoiceDate: issuance.issuance_date || '',
        invoiceNumber: issuance.po_number || '-',
        taxableAmount: amount,
        vatPercent: 0,
        vatAmount: 0,
        amountIncVat: amount,
      },
    ]
  })
}

function buildPettyCashCostRows(pettyCashVouchers: CorporateTaxPettyCashVoucher[]) {
  return pettyCashVouchers.flatMap((voucher) =>
    (voucher.items || []).flatMap((item) => {
      const amount =
        toNumber(item.amount_exc_vat) || toNumber(item.quantity) * toNumber(item.rate)
      if (amount <= 0 && toNumber(item.quantity) <= 0) {
        return []
      }

      return [
        {
          groupLabel: '',
          rawCostCode: item.cost_code || '',
          rawAccountCode: String(item.account_code || '').trim() || item.cost_code || '',
          glDate: item.invoice_date || '',
          supplierName: String(item.supplier_name || '').trim() || '-',
          invoiceDate: item.invoice_date || '',
          invoiceNumber: String(item.invoice_number || voucher.voucher_number || '-'),
          taxableAmount: amount,
          vatPercent: 0,
          vatAmount: 0,
          amountIncVat: amount,
        },
      ]
    })
  )
}

function buildAssociatedCostRows(
  associatedCostEntries: CorporateTaxAssociatedCostEntryRecord[],
  timeAllocationLines: CorporateTaxTimeAllocationLine[]
) {
  return associatedCostEntries.flatMap((entry) =>
    (entry.items || []).flatMap((item) => {
      const startDate = parseISODate(item.start_date || '')
      const endDate = parseISODate(item.end_date || '')

      if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
        return []
      }

      const totalDays = getInclusiveDayCount(startDate, endDate)
      if (totalDays <= 0) {
        return []
      }

      const totalAmount = toNumber(item.amount) || toNumber(item.quantity) * toNumber(item.rate)
      const dailyRate = totalAmount / totalDays

      return buildMonthlySegments(startDate, endDate).flatMap((segment) => {
        const matchingAllocations = timeAllocationLines.filter(
          (line) =>
            line.employee_id === item.employee_id &&
            line.date >= segment.startDate &&
            line.date <= segment.endDate
        )

        const groupedProjectPercentages = new Map<
          string,
          {
            projectName: string
            projectNumber: string
            totalPercentage: number
          }
        >()

        for (const allocation of matchingAllocations) {
          const groupKey = `${allocation.project_number}::${allocation.project_name}`
          const existingGroup = groupedProjectPercentages.get(groupKey)
          const nextPercentage = toNumber(allocation.percentage)

          if (existingGroup) {
            existingGroup.totalPercentage += nextPercentage
          } else {
            groupedProjectPercentages.set(groupKey, {
              projectName: allocation.project_name || '',
              projectNumber: allocation.project_number || '',
              totalPercentage: nextPercentage,
            })
          }
        }

        const totalAllocatedPercentage = Array.from(groupedProjectPercentages.values()).reduce(
          (sum, project) => sum + project.totalPercentage,
          0
        )

        if (totalAllocatedPercentage <= 0) {
          const amount = segment.days * dailyRate

          return [
            {
              groupLabel: '',
              rawCostCode: item.cost_code || entry.cost_code || '',
              rawAccountCode:
                String(item.account_code || '').trim() ||
                item.cost_code ||
                entry.cost_code ||
                '',
              glDate: segment.date,
              supplierName: String(entry.supplier_name || item.employee_name || '').trim() || '-',
              invoiceDate: segment.date,
              invoiceNumber: entry.serial_number || '-',
              taxableAmount: amount,
              vatPercent: 0,
              vatAmount: 0,
              amountIncVat: amount,
            },
          ]
        }

        return Array.from(groupedProjectPercentages.values()).map((project) => {
          const contribution = project.totalPercentage / totalAllocatedPercentage
          const amount = segment.days * dailyRate * contribution

          return {
            groupLabel: '',
            rawCostCode: item.cost_code || entry.cost_code || '',
            rawAccountCode:
              String(item.account_code || '').trim() ||
              item.cost_code ||
              entry.cost_code ||
              '',
            glDate: segment.date,
            supplierName: String(entry.supplier_name || item.employee_name || '').trim() || '-',
            invoiceDate: segment.date,
            invoiceNumber: entry.serial_number || '-',
            taxableAmount: amount,
            vatPercent: 0,
            vatAmount: 0,
            amountIncVat: amount,
          }
        })
      })
    })
  )
}

function buildSalaryCostRows(
  salaryActualIncurredRows: CorporateTaxSalaryActualIncurredCostRow[]
) {
  return salaryActualIncurredRows.flatMap((row) => {
    const amount = toNumber(row.amount)
    if (amount <= 0) {
      return []
    }

    const rawCostCode = String(row.cost_code || '').trim()
    const rawAccountCode = rawCostCode === 'FOH' ? 'Staff Cost' : rawCostCode

    return [
      {
        groupLabel: '',
        rawCostCode,
        rawAccountCode,
        glDate: row.date || '',
        supplierName: String(row.employee_name || '').trim() || '-',
        invoiceDate: row.date || '',
        invoiceNumber: `${row.employee_id || 'PAY'}-${row.date || ''}`,
        taxableAmount: amount,
        vatPercent: 0,
        vatAmount: 0,
        amountIncVat: amount,
      },
    ]
  })
}

function findPurchaseItemByLineNumber(
  purchaseItems: CorporateTaxPurchaseItem[],
  lineNumber: number
) {
  return purchaseItems.find((item) => Number(item.line_number) === Number(lineNumber)) || null
}

function getPrimaryPaymentPhase(phases: CorporateTaxPaymentPhase[]) {
  return (
    phases.find((phase) => phase.invoice_date || phase.gl_date) ||
    phases[0] ||
    null
  )
}

function buildMonthlySegments(startDate: Date, endDate: Date) {
  const segments: Array<{ startDate: string; endDate: string; date: string; days: number }> = []
  let currentStart = startDate

  while (compareDates(currentStart, endDate) <= 0) {
    const monthEnd = getMonthEnd(currentStart)
    const segmentEnd = compareDates(monthEnd, endDate) < 0 ? monthEnd : endDate

    segments.push({
      startDate: formatISODate(currentStart),
      endDate: formatISODate(segmentEnd),
      date: formatISODate(segmentEnd),
      days: getInclusiveDayCount(currentStart, segmentEnd),
    })

    currentStart = addDays(segmentEnd, 1)
  }

  return segments
}

function parseISODate(value: string) {
  if (!value) {
    return null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function formatISODate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function addDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function compareDates(left: Date, right: Date) {
  return left.getTime() - right.getTime()
}

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1
}

function isDateInRange(value: string | null | undefined, fromDate: string, toDate: string) {
  if (!value) {
    return false
  }

  return value >= fromDate && value <= toDate
}

function toNumber(value: unknown) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}
