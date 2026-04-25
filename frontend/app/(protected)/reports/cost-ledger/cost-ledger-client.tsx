'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import { fetchAPI } from '@/lib/api'

type ProjectSelection = {
  projectNumber: string
  projectName: string
}

type PurchaseItem = {
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

type PurchaseOrderRecord = {
  id: number
  order_type: 'project' | 'asset' | 'inventory'
  po_number: string
  po_date_original: string
  project_number: string
  project_name: string
  cost_code: string
  supplier_name: string
  remarks?: string
  purchase_items?: PurchaseItem[]
}

type PaymentPhase = {
  phase_number: number
  invoice_no: string
  invoice_date: string | null
  gl_date: string | null
  paid_date: string | null
}

type PaymentDeliveryItem = {
  line_number: number
  item_description: string
  unit: string
  rate: string | number
  received_quantity: string | number
}

type PaymentRecord = {
  po_number: string
  project_number: string
  project_name: string
  supplier_name: string
  phases: PaymentPhase[]
  delivery_items: PaymentDeliveryItem[]
}

type InventoryIssuanceRecord = {
  po_number: string
  supplier_name: string
  issuance_date: string
  project_name: string
  project_number: string
  cost_code: string
  line_number: number
  item_description: string
  unit: string
  quantity_issued: string | number
  amount: string | number
}

type PettyCashVoucherItem = {
  item: string
  account_code?: string
  project_name: string
  project_number: string
  cost_code: string
  quantity: string | number
  unit: string
  rate: string | number
  amount_exc_vat: string | number
  invoice_number: string
  invoice_date: string | null
  supplier_name: string
  forecast_date: string
}

type PettyCashVoucher = {
  voucher_number: string
  items: PettyCashVoucherItem[]
}

type AssociatedCostItem = {
  line_number: number
  employee_id: string
  employee_name: string
  item_description: string
  quantity: string | number
  unit: string
  rate: string | number
  start_date: string
  end_date: string
}

type AssociatedCostEntryRecord = {
  serial_number: string
  supplier_name: string
  date: string
  cost_code: string
  items: AssociatedCostItem[]
}

type AssociatedCostPaymentItem = {
  line_number: number
  employee_id: string
  employee_name: string
  item_description: string
  quantity: string | number
  unit: string
  rate: string | number
  received_quantity: string | number
  invoice_number: string
  invoice_date: string | null
  gl_date: string | null
}

type AssociatedCostPaymentRecord = {
  serial_number: string
  supplier_name: string
  entry_date: string
  cost_code: string
  delivery_items: AssociatedCostPaymentItem[]
}

type TimeAllocationLine = {
  date: string
  employee_id: string
  project_number: string
  project_name: string
  percentage: string | number
}

type LedgerRow = {
  key: string
  filterDate: string | null
  projectNumber: string
  projectName: string
  costCode: string
  accountCode: string
  itemDescription: string
  glDate: string | null
  invoiceDate: string | null
  supplierEmployee: string
  currency: string
  cost: number
  exchangeRate: number
  costInAed: number
  qty: number
  poNumber: string
  invoiceNumber: string
  remarks: string
  transactionSource: string
}

export default function CostLedgerClient() {
  const [selection, setSelection] = useState<ProjectSelection>({
    projectNumber: '',
    projectName: '',
  })
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [
          projectOrders,
          assetOrders,
          inventoryOrders,
          paymentEntries,
          inventoryIssuances,
          pettyCashVouchers,
          associatedCostEntries,
          associatedCostPayments,
          timeAllocationLines,
        ] = await Promise.all([
          fetchAPI('/procurement/purchase-order/?order_type=project'),
          fetchAPI('/procurement/purchase-order/?order_type=asset'),
          fetchAPI('/procurement/purchase-order/?order_type=inventory'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/procurement/inventory-issuance/'),
          fetchAPI('/procurement/petty-cash/'),
          fetchAPI('/employees/associated-cost/'),
          fetchAPI('/employees/associated-cost/payment/'),
          fetchAPI('/production/time-allocation/').catch(() => []),
        ])

        const combinedRows = buildCostLedgerRows({
          projectOrders: Array.isArray(projectOrders) ? (projectOrders as PurchaseOrderRecord[]) : [],
          assetOrders: Array.isArray(assetOrders) ? (assetOrders as PurchaseOrderRecord[]) : [],
          inventoryOrders: Array.isArray(inventoryOrders)
            ? (inventoryOrders as PurchaseOrderRecord[])
            : [],
          paymentEntries: Array.isArray(paymentEntries) ? (paymentEntries as PaymentRecord[]) : [],
          inventoryIssuances: Array.isArray(inventoryIssuances)
            ? (inventoryIssuances as InventoryIssuanceRecord[])
            : [],
          pettyCashVouchers: Array.isArray(pettyCashVouchers)
            ? (pettyCashVouchers as PettyCashVoucher[])
            : [],
          associatedCostEntries: Array.isArray(associatedCostEntries)
            ? (associatedCostEntries as AssociatedCostEntryRecord[])
            : [],
          associatedCostPayments: Array.isArray(associatedCostPayments)
            ? (associatedCostPayments as AssociatedCostPaymentRecord[])
            : [],
          timeAllocationLines: Array.isArray(timeAllocationLines)
            ? (timeAllocationLines as TimeAllocationLine[])
            : [],
        })

        setRows(
          combinedRows.sort((left, right) => {
            const dateCompare = normalizeDateValue(left.filterDate) - normalizeDateValue(right.filterDate)
            if (dateCompare !== 0) {
              return dateCompare
            }

            const sourceCompare = left.transactionSource.localeCompare(right.transactionSource)
            if (sourceCompare !== 0) {
              return sourceCompare
            }

            return left.itemDescription.localeCompare(right.itemDescription)
          })
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cost ledger.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)

  const filteredRows = useMemo(() => {
    if (hasInvalidDateRange) {
      return []
    }

    return rows.filter((row) => {
      const matchesProject =
        (!selection.projectNumber || row.projectNumber === selection.projectNumber) &&
        (!selection.projectName || row.projectName === selection.projectName)
      const matchesFromDate =
        !fromDate || (row.filterDate !== null && row.filterDate >= fromDate)
      const matchesToDate =
        !toDate || (row.filterDate !== null && row.filterDate <= toDate)

      return matchesProject && matchesFromDate && matchesToDate
    })
  }, [fromDate, hasInvalidDateRange, rows, selection, toDate])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Cost Ledger</h1>
        <p className="mt-2 text-slate-700">
          Review project-wise cost transactions from project PO, inventory PO, asset PO,
          petty cash, and associated cost.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <ProjectSelectFields
            projectNumber={selection.projectNumber}
            projectName={selection.projectName}
            onChange={({ projectNumber, projectName }) =>
              setSelection({ projectNumber, projectName })
            }
          />

          <Field label="From Date">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>

        {hasInvalidDateRange ? (
          <p className="mt-4 text-sm text-red-700">
            To Date should be the same as or later than From Date.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Cost Ledger Table</h2>
          <p className="mt-2 text-sm text-slate-600">
            {hasInvalidDateRange
              ? 'Choose a valid date range to view the ledger.'
              : `Showing ${filteredRows.length} ${filteredRows.length === 1 ? 'row' : 'rows'}`}
          </p>
        </div>

        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[2500px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Cost Code</HeaderCell>
                <HeaderCell>Accounts Code</HeaderCell>
                <HeaderCell>Item Description</HeaderCell>
                <HeaderCell>GL Date</HeaderCell>
                <HeaderCell>Invoice Date</HeaderCell>
                <HeaderCell>Supplier / Employee</HeaderCell>
                <HeaderCell>Currency</HeaderCell>
                <HeaderCell>Cost</HeaderCell>
                <HeaderCell>Exchange Rate</HeaderCell>
                <HeaderCell>Cost in AED</HeaderCell>
                <HeaderCell>Qty</HeaderCell>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell>Invoice #</HeaderCell>
                <HeaderCell>Remarks</HeaderCell>
                <HeaderCell>Transaction Sources</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={17}>Loading cost ledger...</BodyCell>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.key} className="bg-white">
                    <BodyCell>{row.projectNumber}</BodyCell>
                    <BodyCell>{row.projectName}</BodyCell>
                    <BodyCell>{row.costCode || '-'}</BodyCell>
                    <BodyCell>{row.accountCode || '-'}</BodyCell>
                    <BodyCell>{row.itemDescription || '-'}</BodyCell>
                    <BodyCell>{formatDate(row.glDate)}</BodyCell>
                    <BodyCell>{formatDate(row.invoiceDate)}</BodyCell>
                    <BodyCell>{row.supplierEmployee || '-'}</BodyCell>
                    <BodyCell>{row.currency || '-'}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.cost)}</BodyCell>
                    <BodyCell className="text-right">{formatExchangeRate(row.exchangeRate)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.costInAed)}</BodyCell>
                    <BodyCell className="text-right">{formatQuantity(row.qty)}</BodyCell>
                    <BodyCell>{row.poNumber || '-'}</BodyCell>
                    <BodyCell>{row.invoiceNumber || '-'}</BodyCell>
                    <BodyCell>{row.remarks || '-'}</BodyCell>
                    <BodyCell>{row.transactionSource}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={17}>
                    {hasInvalidDateRange
                      ? 'Choose a valid date range to see ledger rows.'
                      : 'No cost ledger rows found for the selected filters.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function buildCostLedgerRows({
  projectOrders,
  assetOrders,
  inventoryOrders,
  paymentEntries,
  inventoryIssuances,
  pettyCashVouchers,
  associatedCostEntries,
  associatedCostPayments,
  timeAllocationLines,
}: {
  projectOrders: PurchaseOrderRecord[]
  assetOrders: PurchaseOrderRecord[]
  inventoryOrders: PurchaseOrderRecord[]
  paymentEntries: PaymentRecord[]
  inventoryIssuances: InventoryIssuanceRecord[]
  pettyCashVouchers: PettyCashVoucher[]
  associatedCostEntries: AssociatedCostEntryRecord[]
  associatedCostPayments: AssociatedCostPaymentRecord[]
  timeAllocationLines: TimeAllocationLine[]
}) {
  const rows: LedgerRow[] = []
  const projectOrderMap = new Map(projectOrders.map((order) => [order.po_number, order]))
  const inventoryOrderMap = new Map(inventoryOrders.map((order) => [order.po_number, order]))
  const associatedEntryMap = new Map(
    associatedCostEntries.map((entry) => [entry.serial_number, entry])
  )

  paymentEntries.forEach((entry) => {
    const order = projectOrderMap.get(entry.po_number)
    if (!order) return

    const phaseMeta = getPrimaryPhase(entry.phases || [])

    ;(entry.delivery_items || []).forEach((deliveryItem) => {
      const receivedQuantity = toNumber(deliveryItem.received_quantity)
      if (receivedQuantity <= 0) return

      const purchaseItem = (order.purchase_items || []).find(
        (item) => item.line_number === deliveryItem.line_number
      )
      const sourceRate = toNumber(purchaseItem?.source_rate ?? purchaseItem?.rate)
      const exchangeRate = toNumber(purchaseItem?.exchange_rate) || 1
      const costInAed =
        receivedQuantity * (toNumber(purchaseItem?.rate) || toNumber(deliveryItem.rate))
      const cost = receivedQuantity * sourceRate

      rows.push({
        key: `project-${entry.po_number}-${deliveryItem.line_number}`,
        filterDate: phaseMeta.glDate || phaseMeta.invoiceDate || order.po_date_original,
        projectNumber: order.project_number || entry.project_number || '',
        projectName: order.project_name || entry.project_name || '',
        costCode: order.cost_code || '',
        accountCode: String(purchaseItem?.account_code || '').trim(),
        itemDescription: purchaseItem?.item_description || deliveryItem.item_description || '',
        glDate: phaseMeta.glDate,
        invoiceDate: phaseMeta.invoiceDate,
        supplierEmployee: order.supplier_name || entry.supplier_name || '',
        currency: String(purchaseItem?.currency || 'AED').trim() || 'AED',
        cost,
        exchangeRate,
        costInAed,
        qty: receivedQuantity,
        poNumber: order.po_number || '',
        invoiceNumber: phaseMeta.invoiceNo,
        remarks: order.remarks || '',
        transactionSource: 'Project PO',
      })
    })
  })

  inventoryIssuances.forEach((issuance) => {
    const order = inventoryOrderMap.get(issuance.po_number)
    const purchaseItem = order?.purchase_items?.find(
      (item) => item.line_number === issuance.line_number
    )
    const quantity = toNumber(issuance.quantity_issued)
    const sourceRate = toNumber(purchaseItem?.source_rate ?? purchaseItem?.rate)
    const exchangeRate = toNumber(purchaseItem?.exchange_rate) || 1

    rows.push({
      key: `inventory-${issuance.po_number}-${issuance.line_number}-${issuance.issuance_date}`,
      filterDate: issuance.issuance_date,
      projectNumber: issuance.project_number || '',
      projectName: issuance.project_name || '',
      costCode: issuance.cost_code || '',
      accountCode: String(purchaseItem?.account_code || '').trim(),
      itemDescription: purchaseItem?.item_description || issuance.item_description || '',
      glDate: null,
      invoiceDate: issuance.issuance_date,
      supplierEmployee: issuance.supplier_name || order?.supplier_name || '',
      currency: String(purchaseItem?.currency || 'AED').trim() || 'AED',
      cost: quantity * sourceRate,
      exchangeRate,
      costInAed: toNumber(issuance.amount),
      qty: quantity,
      poNumber: issuance.po_number || '',
      invoiceNumber: '',
      remarks: order?.remarks || '',
      transactionSource: 'Inventory PO',
    })
  })

  assetOrders.forEach((order) => {
    ;(order.purchase_items || []).forEach((item) => {
      const startDate = parseISODate(item.depreciation_start_date || '')
      const endDate = parseISODate(item.depreciation_end_date || '')

      if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
        return
      }

      const totalDays = getInclusiveDayCount(startDate, endDate)
      if (totalDays <= 0) {
        return
      }

      const sourceAmount = toNumber(item.source_amount) || toNumber(item.quantity) * toNumber(item.source_rate)
      const amountAed = toNumber(item.amount) || toNumber(item.amount_aed)
      const sourceDailyRate = sourceAmount / totalDays
      const dailyRateAed = amountAed / totalDays
      const segments = buildDepreciationSegments(startDate, endDate)

      segments.forEach((segment, index) => {
        rows.push({
          key: `asset-${order.po_number}-${item.line_number}-${segment.date}-${index}`,
          filterDate: segment.date,
          projectNumber: order.project_number || '',
          projectName: order.project_name || '',
          costCode: order.cost_code || '',
          accountCode: String(item.account_code || '').trim(),
          itemDescription: item.item_description || '',
          glDate: null,
          invoiceDate: segment.date,
          supplierEmployee: order.supplier_name || '',
          currency: String(item.currency || 'AED').trim() || 'AED',
          cost: sourceDailyRate * segment.days,
          exchangeRate: toNumber(item.exchange_rate) || 1,
          costInAed: dailyRateAed * segment.days,
          qty: segment.days,
          poNumber: order.po_number || '',
          invoiceNumber: '',
          remarks: order.remarks || '',
          transactionSource: 'Asset PO',
        })
      })
    })
  })

  pettyCashVouchers.forEach((voucher) => {
    ;(voucher.items || []).forEach((item, index) => {
      rows.push({
        key: `petty-${voucher.voucher_number}-${index + 1}`,
        filterDate: item.invoice_date || item.forecast_date || null,
        projectNumber: item.project_number || '',
        projectName: item.project_name || '',
        costCode: item.cost_code || '',
        accountCode: String(item.account_code || '').trim(),
        itemDescription: item.item || '',
        glDate: null,
        invoiceDate: item.invoice_date,
        supplierEmployee: item.supplier_name || '',
        currency: 'AED',
        cost: toNumber(item.amount_exc_vat),
        exchangeRate: 1,
        costInAed: toNumber(item.amount_exc_vat),
        qty: toNumber(item.quantity),
        poNumber: voucher.voucher_number || '',
        invoiceNumber: item.invoice_number || '',
        remarks: '',
        transactionSource: 'Petty Cash PO',
      })
    })
  })

  associatedCostPayments.forEach((payment) => {
    const entry = associatedEntryMap.get(payment.serial_number)

    ;(payment.delivery_items || []).forEach((deliveryItem) => {
      const receivedQuantity = toNumber(deliveryItem.received_quantity)
      if (receivedQuantity <= 0) return

      const sourceItem = entry?.items?.find((item) => item.line_number === deliveryItem.line_number)
      const projectGroups = buildContributionGroups(
        sourceItem?.employee_id || deliveryItem.employee_id,
        sourceItem?.start_date || entry?.date || payment.entry_date,
        sourceItem?.end_date || sourceItem?.start_date || entry?.date || payment.entry_date,
        timeAllocationLines
      )
      const baseAmount = receivedQuantity * toNumber(deliveryItem.rate)

      projectGroups.forEach((group, index) => {
        const ratio = group.contribution / 100
        rows.push({
          key: `associated-${payment.serial_number}-${deliveryItem.line_number}-${index}`,
          filterDate: deliveryItem.gl_date || deliveryItem.invoice_date || payment.entry_date,
          projectNumber: group.projectNumber,
          projectName: group.projectName,
          costCode: payment.cost_code || entry?.cost_code || '',
          accountCode: '',
          itemDescription: deliveryItem.item_description || sourceItem?.item_description || '',
          glDate: deliveryItem.gl_date,
          invoiceDate: deliveryItem.invoice_date,
          supplierEmployee: buildSupplierEmployeeLabel(
            payment.supplier_name || entry?.supplier_name || '',
            deliveryItem.employee_name || sourceItem?.employee_name || ''
          ),
          currency: 'AED',
          cost: baseAmount * ratio,
          exchangeRate: 1,
          costInAed: baseAmount * ratio,
          qty: receivedQuantity * ratio,
          poNumber: payment.serial_number || '',
          invoiceNumber: deliveryItem.invoice_number || '',
          remarks: '',
          transactionSource: 'Associated Cost',
        })
      })
    })
  })

  return rows
}

function getPrimaryPhase(phases: PaymentPhase[]) {
  const primaryPhase =
    phases.find((phase) => phase.invoice_date || phase.gl_date || phase.invoice_no) ||
    phases[0] ||
    null

  return {
    invoiceNo: primaryPhase?.invoice_no || '',
    invoiceDate: primaryPhase?.invoice_date || null,
    glDate: primaryPhase?.gl_date || null,
  }
}

function buildContributionGroups(
  employeeId: string,
  startDateValue: string,
  endDateValue: string,
  timeAllocationLines: TimeAllocationLine[]
) {
  const matchingLines = timeAllocationLines.filter(
    (line) =>
      line.employee_id === employeeId &&
      line.date >= startDateValue &&
      line.date <= endDateValue
  )

  const groupedPercentages = new Map<
    string,
    {
      projectNumber: string
      projectName: string
      totalPercentage: number
    }
  >()

  matchingLines.forEach((line) => {
    const key = `${line.project_number}::${line.project_name}`
    const existing = groupedPercentages.get(key)
    const nextPercentage = toNumber(line.percentage)

    if (existing) {
      existing.totalPercentage += nextPercentage
      return
    }

    groupedPercentages.set(key, {
      projectNumber: line.project_number || '-',
      projectName: line.project_name || '-',
      totalPercentage: nextPercentage,
    })
  })

  const totalPercentage = Array.from(groupedPercentages.values()).reduce(
    (sum, group) => sum + group.totalPercentage,
    0
  )

  if (totalPercentage <= 0) {
    return [
      {
        projectNumber: '-',
        projectName: 'Unallocated',
        contribution: 100,
      },
    ]
  }

  return Array.from(groupedPercentages.values()).map((group) => ({
    projectNumber: group.projectNumber,
    projectName: group.projectName,
    contribution: (group.totalPercentage / totalPercentage) * 100,
  }))
}

function buildSupplierEmployeeLabel(supplierName: string, employeeName: string) {
  if (supplierName && employeeName) {
    return `${supplierName} / ${employeeName}`
  }

  return supplierName || employeeName || '-'
}

function buildDepreciationSegments(startDate: Date, endDate: Date) {
  const segments: Array<{ date: string; days: number }> = []
  let currentStart = startDate

  while (compareDates(currentStart, endDate) <= 0) {
    const monthEnd = getMonthEnd(currentStart)
    const segmentEnd = compareDates(monthEnd, endDate) < 0 ? monthEnd : endDate

    segments.push({
      date: formatISODate(segmentEnd),
      days: getInclusiveDayCount(currentStart, segmentEnd),
    })

    currentStart = addDays(segmentEnd, 1)
  }

  return segments
}

function parseISODate(value: string) {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

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

function normalizeDateValue(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const parsedDate = parseISODate(value)
  return parsedDate ? parsedDate.getTime() : Number.POSITIVE_INFINITY
}

function toNumber(value: string | number | undefined | null) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: string | null) {
  if (!value) return '-'

  const parsed = parseISODate(value)
  if (!parsed) return value

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatExchangeRate(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

function formatQuantity(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">{label}</label>
      {children}
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-300 px-4 py-3 font-semibold text-slate-900">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  colSpan,
  className = '',
}: {
  children: React.ReactNode
  colSpan?: number
  className?: string
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-300 px-4 py-3 align-top text-slate-700 ${className}`.trim()}
    >
      {children}
    </td>
  )
}
