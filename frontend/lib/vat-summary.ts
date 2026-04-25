import { ClientData, ContractPaymentLog, TenderLog } from '@/lib/estimation-storage'
import { CompanyName } from '@/lib/company'

export type VatSummaryCategoryKey =
  | 'domestic-taxable-sales'
  | 'intra-gcc-sales'
  | 'export-outside-gcc'
  | 'domestic-taxable-purchase-with-vat'
  | 'direct-pay-to-fta'
  | 'unregistered-domestic-purchase'

export type VatCategorySummary = {
  taxableAmount: number
  vatAmount: number
}

export type VatSummaryResult = {
  sales: Record<VatSummaryCategoryKey, VatCategorySummary>
  purchases: Record<VatSummaryCategoryKey, VatCategorySummary>
  totalSalesTaxableAmount: number
  totalSalesVatAmount: number
  totalPurchasesTaxableAmount: number
  totalPurchasesVatAmount: number
  vatPayableOrRefundable: number
}

export type DomesticTaxableSalesRow = {
  sn: number
  invoiceDate: string
  customerName: string
  customerTrn: string
  invoiceNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

export type ExportOutsideGccSalesRow = {
  sn: number
  invoiceDate: string
  customerName: string
  customerCountry: string
  customerTrn: string
  invoiceNumber: string
  amount: number
}

export type IntraGccSalesRow = {
  sn: number
  invoiceDate: string
  customerName: string
  customerTrn: string
  invoiceNumber: string
  amount: number
}

export type DomesticTaxablePurchaseRow = {
  invoiceDate: string
  supplierName: string
  supplierTrn: string
  supplierInvoiceNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

export type DirectPayToFtaRow = {
  invoiceDate: string
  supplierName: string
  supplierTrn: string
  supplierInvoiceRefNumber: string
  remarks: string
  vatAmount: number
}

export type UnregisteredPurchaseRow = {
  invoiceDate: string
  supplierName: string
  supplierInvoiceRefNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

export type VatProjectOption = {
  id: number
  project_number: string
  project_name: string
  tender_number?: string
}

export type VatPurchaseOrderRecord = {
  id: number
  po_number: string
  supplier_name?: string
  supplier_country?: string
}

export type VatPaymentPhase = {
  amount?: string | number
  paid_inc_vat?: string | number
  paid_exc_vat?: string | number
  vat?: string | number
  invoice_no?: string
  invoice_date?: string | null
  gl_date?: string | null
}

export type VatPaymentEntryRecord = {
  id: number
  po_number: string
  supplier_name?: string
  phases?: VatPaymentPhase[]
}

export type VatAssociatedCostEntryItem = {
  line_number: number
  amount?: string | number
  vat_percent?: string | number
}

export type VatAssociatedCostEntryRecord = {
  serial_number: string
  supplier_name?: string
  items?: VatAssociatedCostEntryItem[]
}

export type VatAssociatedCostPaymentItem = {
  line_number: number
  quantity?: string | number
  rate?: string | number
  received_quantity?: string | number
  invoice_number?: string
  invoice_date?: string | null
}

export type VatAssociatedCostPaymentRecord = {
  id: number
  serial_number: string
  supplier_name?: string
  delivery_items?: VatAssociatedCostPaymentItem[]
}

type SalesRegisterBaseRow = {
  sn: number
  invoiceDate: string
  customerName: string
  customerCountry: string
  customerTrn: string
  invoiceNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
}

type PurchaseRegisterBaseRow = {
  invoiceDate: string
  supplierName: string
  supplierTrn: string
  supplierInvoiceRefNumber: string
  taxableAmount: number
  vatPercent: number
  vatAmount: number
  amountIncVat: number
  remarks: string
}

export const vatSummaryLabels: Record<VatSummaryCategoryKey, string> = {
  'domestic-taxable-sales': 'Domestic Taxable Sales @ 5%',
  'intra-gcc-sales': 'Intra GCC Sales',
  'export-outside-gcc': 'Export Outside GCC Sales',
  'domestic-taxable-purchase-with-vat': 'Domestic Taxable Purchases @ 5%',
  'direct-pay-to-fta': 'Direct Pay to FTA',
  'unregistered-domestic-purchase': 'Domestic Purchases - Unregistered',
}

export const vatSummaryClickableLabels: Record<VatSummaryCategoryKey, string> = {
  'domestic-taxable-sales': 'Domestic Taxable Sales',
  'intra-gcc-sales': 'Intra GCC Sales',
  'export-outside-gcc': 'Export Outside GCC',
  'domestic-taxable-purchase-with-vat': 'Domestic Taxable Purchase with VAT',
  'direct-pay-to-fta': 'Direct Pay to FTA',
  'unregistered-domestic-purchase': 'Unregistered Domestic Purchase',
}

export const vatSalesCategoryOrder: VatSummaryCategoryKey[] = [
  'domestic-taxable-sales',
  'intra-gcc-sales',
  'export-outside-gcc',
]

export const vatPurchaseCategoryOrder: VatSummaryCategoryKey[] = [
  'domestic-taxable-purchase-with-vat',
  'direct-pay-to-fta',
  'unregistered-domestic-purchase',
]

export function getVatCompanyDisplayName(company: CompanyName | null) {
  if (company === 'AKR') {
    return 'AKR METAL INDUSTRIAL LLC'
  }

  return 'AL RIYADA METAL INDUSTRIAL LLC SP'
}

export function buildVatSummary({
  fromDate,
  toDate,
  contractPaymentLogs,
  tenderLogs,
  clientData,
  projectOptions,
  purchaseOrders,
  paymentEntries,
  associatedCostEntries,
  associatedCostPayments,
}: {
  fromDate: string
  toDate: string
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: VatProjectOption[]
  purchaseOrders: VatPurchaseOrderRecord[]
  paymentEntries: VatPaymentEntryRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
}): VatSummaryResult {
  const sales = createEmptyCategoryRecord()
  const purchases = createEmptyCategoryRecord()
  const domesticTaxableSalesRows = buildDomesticTaxableSalesRegister({
    fromDate,
    toDate,
    contractPaymentLogs,
    tenderLogs,
    clientData,
    projectOptions,
  })
  const intraGccSalesRows = buildIntraGccSalesRegister({
    fromDate,
    toDate,
    contractPaymentLogs,
    tenderLogs,
    clientData,
    projectOptions,
  })
  const exportOutsideGccSalesRows = buildExportOutsideGccSalesRegister({
    fromDate,
    toDate,
    contractPaymentLogs,
    tenderLogs,
    clientData,
    projectOptions,
  })
  const domesticTaxablePurchaseRows = buildDomesticTaxablePurchaseRegister({
    fromDate,
    toDate,
    paymentEntries,
    purchaseOrders,
    associatedCostEntries,
    associatedCostPayments,
  })
  const directPayToFtaRows = buildDirectPayToFtaRegister({
    fromDate,
    toDate,
    paymentEntries,
    purchaseOrders,
    associatedCostEntries,
    associatedCostPayments,
  })
  const unregisteredPurchaseRows = buildUnregisteredPurchaseRegister({
    fromDate,
    toDate,
    paymentEntries,
    purchaseOrders,
    associatedCostEntries,
    associatedCostPayments,
  })

  for (const row of domesticTaxableSalesRows) {
    sales['domestic-taxable-sales'].taxableAmount += row.taxableAmount
    sales['domestic-taxable-sales'].vatAmount += row.vatAmount
  }

  for (const row of intraGccSalesRows) {
    sales['intra-gcc-sales'].taxableAmount += row.amount
  }

  for (const row of exportOutsideGccSalesRows) {
    sales['export-outside-gcc'].taxableAmount += row.amount
  }

  for (const row of domesticTaxablePurchaseRows) {
    purchases['domestic-taxable-purchase-with-vat'].taxableAmount += row.taxableAmount
    purchases['domestic-taxable-purchase-with-vat'].vatAmount += row.vatAmount
  }

  for (const row of directPayToFtaRows) {
    purchases['direct-pay-to-fta'].vatAmount += row.vatAmount
  }

  for (const row of unregisteredPurchaseRows) {
    purchases['unregistered-domestic-purchase'].taxableAmount += row.taxableAmount
    purchases['unregistered-domestic-purchase'].vatAmount += row.vatAmount
  }

  const totalSalesTaxableAmount = vatSalesCategoryOrder.reduce(
    (total, key) => total + sales[key].taxableAmount,
    0
  )
  const totalSalesVatAmount = vatSalesCategoryOrder.reduce(
    (total, key) => total + sales[key].vatAmount,
    0
  )
  const totalPurchasesTaxableAmount = vatPurchaseCategoryOrder.reduce(
    (total, key) => total + purchases[key].taxableAmount,
    0
  )
  const totalPurchasesVatAmount = vatPurchaseCategoryOrder.reduce(
    (total, key) => total + purchases[key].vatAmount,
    0
  )

  return {
    sales,
    purchases,
    totalSalesTaxableAmount,
    totalSalesVatAmount,
    totalPurchasesTaxableAmount,
    totalPurchasesVatAmount,
    vatPayableOrRefundable: totalSalesVatAmount - totalPurchasesVatAmount,
  }
}

export function buildDomesticTaxableSalesRegister({
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
  projectOptions: VatProjectOption[]
}) {
  return buildSalesRegisterRows({
    targetCategory: 'domestic-taxable-sales',
    fromDate,
    toDate,
    contractPaymentLogs,
    tenderLogs,
    clientData,
    projectOptions,
  }).map((row) => ({
    ...row,
    taxableAmount: row.taxableAmount,
    vatPercent: row.vatPercent,
    vatAmount: row.vatAmount,
    amountIncVat: row.amountIncVat,
  }))
}

export function buildExportOutsideGccSalesRegister({
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
  projectOptions: VatProjectOption[]
}) {
  return buildSalesRegisterRows({
    targetCategory: 'export-outside-gcc',
    fromDate,
    toDate,
    contractPaymentLogs,
    tenderLogs,
    clientData,
    projectOptions,
  }).map((row) => ({
    sn: row.sn,
    invoiceDate: row.invoiceDate,
    customerName: row.customerName,
    customerCountry: row.customerCountry,
    customerTrn: row.customerTrn,
    invoiceNumber: row.invoiceNumber,
    amount: row.taxableAmount,
  })) satisfies ExportOutsideGccSalesRow[]
}

export function buildIntraGccSalesRegister({
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
  projectOptions: VatProjectOption[]
}) {
  return buildSalesRegisterRows({
    targetCategory: 'intra-gcc-sales',
    fromDate,
    toDate,
    contractPaymentLogs,
    tenderLogs,
    clientData,
    projectOptions,
  }).map((row) => ({
    sn: row.sn,
    invoiceDate: row.invoiceDate,
    customerName: row.customerName,
    customerTrn: row.customerTrn,
    invoiceNumber: row.invoiceNumber,
    amount: row.taxableAmount,
  })) satisfies IntraGccSalesRow[]
}

function buildSalesRegisterRows({
  targetCategory,
  fromDate,
  toDate,
  contractPaymentLogs,
  tenderLogs,
  clientData,
  projectOptions,
}: {
  targetCategory:
    | 'domestic-taxable-sales'
    | 'intra-gcc-sales'
    | 'export-outside-gcc'
  fromDate: string
  toDate: string
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: VatProjectOption[]
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
    .filter((payment) => isDateInRange(payment.submittedDate, fromDate, toDate))
    .map((payment) => {
      const project = projectByNumber.get(payment.projectNumber)
      const tender = project?.tender_number
        ? tenderByNumber.get(project.tender_number)
        : tenderLogs.find(
            (item) =>
              item.projectName === payment.projectName ||
              item.tenderNumber === project?.tender_number
          )
      const customer = tender?.clientName
        ? clientByName.get(tender.clientName)
        : undefined
      const category = classifySalesCategory(
        tender?.geography,
        normalizeCountry(customer?.country)
      )

      if (category !== targetCategory) {
        return null
      }

      return {
        sn: payment.sn,
        invoiceDate: payment.submittedDate || '',
        customerName: tender?.clientName || payment.projectName || '-',
        customerCountry: customer?.country || '-',
        customerTrn: customer?.supplierTrnNo || '-',
        invoiceNumber: String(payment.sn || ''),
        taxableAmount: toNumber(payment.netSubmittedAmount),
        vatPercent: toNumber(payment.submittedVat),
        vatAmount: toNumber(payment.submittedVatAmount),
        amountIncVat: toNumber(payment.netSubmittedIncVat),
      } satisfies SalesRegisterBaseRow
    })
    .filter((row): row is SalesRegisterBaseRow => Boolean(row))
    .sort((left, right) => {
      if (left.invoiceDate !== right.invoiceDate) {
        return left.invoiceDate.localeCompare(right.invoiceDate)
      }

      return left.sn - right.sn
    })
}

export function buildDomesticTaxablePurchaseRegister({
  fromDate,
  toDate,
  paymentEntries,
  purchaseOrders,
  associatedCostEntries,
  associatedCostPayments,
}: {
  fromDate: string
  toDate: string
  paymentEntries: VatPaymentEntryRecord[]
  purchaseOrders: VatPurchaseOrderRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
}) {
  return buildPurchaseRegisterRows({
    fromDate,
    toDate,
    paymentEntries,
    purchaseOrders,
    associatedCostEntries,
    associatedCostPayments,
    targetCategory: 'domestic-taxable-purchase-with-vat',
  }).map((row) => ({
    invoiceDate: row.invoiceDate,
    supplierName: row.supplierName,
    supplierTrn: row.supplierTrn,
    supplierInvoiceNumber: row.supplierInvoiceRefNumber,
    taxableAmount: row.taxableAmount,
    vatPercent: row.vatPercent,
    vatAmount: row.vatAmount,
    amountIncVat: row.amountIncVat,
  })) satisfies DomesticTaxablePurchaseRow[]
}

export function buildDirectPayToFtaRegister({
  fromDate,
  toDate,
  paymentEntries,
  purchaseOrders,
  associatedCostEntries,
  associatedCostPayments,
}: {
  fromDate: string
  toDate: string
  paymentEntries: VatPaymentEntryRecord[]
  purchaseOrders: VatPurchaseOrderRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
}) {
  return buildPurchaseRegisterRows({
    fromDate,
    toDate,
    paymentEntries,
    purchaseOrders,
    associatedCostEntries,
    associatedCostPayments,
    targetCategory: 'direct-pay-to-fta',
  }).map((row) => ({
    invoiceDate: row.invoiceDate,
    supplierName: row.supplierName,
    supplierTrn: row.supplierTrn,
    supplierInvoiceRefNumber: row.supplierInvoiceRefNumber,
    remarks: row.remarks,
    vatAmount: row.vatAmount,
  })) satisfies DirectPayToFtaRow[]
}

export function buildUnregisteredPurchaseRegister({
  fromDate,
  toDate,
  paymentEntries,
  purchaseOrders,
  associatedCostEntries,
  associatedCostPayments,
}: {
  fromDate: string
  toDate: string
  paymentEntries: VatPaymentEntryRecord[]
  purchaseOrders: VatPurchaseOrderRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
}) {
  return buildPurchaseRegisterRows({
    fromDate,
    toDate,
    paymentEntries,
    purchaseOrders,
    associatedCostEntries,
    associatedCostPayments,
    targetCategory: 'unregistered-domestic-purchase',
  }).map((row) => ({
    invoiceDate: row.invoiceDate,
    supplierName: row.supplierName,
    supplierInvoiceRefNumber: row.supplierInvoiceRefNumber,
    taxableAmount: row.taxableAmount,
    vatPercent: row.vatPercent,
    vatAmount: row.vatAmount,
    amountIncVat: row.amountIncVat,
  })) satisfies UnregisteredPurchaseRow[]
}

function buildPurchaseRegisterRows({
  fromDate,
  toDate,
  paymentEntries,
  purchaseOrders,
  associatedCostEntries,
  associatedCostPayments,
  targetCategory,
}: {
  fromDate: string
  toDate: string
  paymentEntries: VatPaymentEntryRecord[]
  purchaseOrders: VatPurchaseOrderRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
  targetCategory:
    | 'domestic-taxable-purchase-with-vat'
    | 'direct-pay-to-fta'
    | 'unregistered-domestic-purchase'
}) {
  const rows: PurchaseRegisterBaseRow[] = []
  const purchaseOrderByNumber = new Map(
    purchaseOrders.map((order) => [order.po_number, order] as const)
  )
  const associatedCostEntryBySerial = new Map(
    associatedCostEntries.map((entry) => [entry.serial_number, entry] as const)
  )

  for (const paymentEntry of paymentEntries) {
    const purchaseOrder = purchaseOrderByNumber.get(paymentEntry.po_number)
    const supplierName =
      paymentEntry.supplier_name || purchaseOrder?.supplier_name || ''

    for (const phase of paymentEntry.phases || []) {
      if (!isDateInRange(phase.invoice_date, fromDate, toDate)) {
        continue
      }

      const vatAmount = toNumber(phase.vat)
      const taxableAmount =
        toNumber(phase.paid_exc_vat) ||
        Math.max(toNumber(phase.paid_inc_vat) - vatAmount, 0)
      const category = classifyPurchaseCategory({
        supplierName,
        vatAmount,
      })

      if (category !== targetCategory) {
        continue
      }

      rows.push({
        invoiceDate: phase.invoice_date || '',
        supplierName: supplierName || '-',
        supplierTrn: '-',
        supplierInvoiceRefNumber: phase.invoice_no || '-',
        taxableAmount,
        vatPercent: taxableAmount > 0 ? (vatAmount / taxableAmount) * 100 : 0,
        vatAmount,
        amountIncVat: taxableAmount + vatAmount,
        remarks: '',
      })
    }
  }

  for (const payment of associatedCostPayments) {
    const sourceEntry = associatedCostEntryBySerial.get(payment.serial_number)

    if (!sourceEntry) {
      continue
    }

    const sourceItemsByLine = new Map(
      (sourceEntry.items || []).map((item) => [item.line_number, item] as const)
    )

    for (const item of payment.delivery_items || []) {
      if (!isDateInRange(item.invoice_date, fromDate, toDate)) {
        continue
      }

      const sourceItem = sourceItemsByLine.get(item.line_number)
      const taxableAmount =
        toNumber(item.received_quantity) * toNumber(item.rate)
      const vatPercent = toNumber(sourceItem?.vat_percent)
      const vatAmount = taxableAmount * (vatPercent / 100)
      const supplierName = payment.supplier_name || sourceEntry.supplier_name || ''
      const category = classifyPurchaseCategory({
        supplierName,
        vatAmount,
      })

      if (category !== targetCategory) {
        continue
      }

      rows.push({
        invoiceDate: item.invoice_date || '',
        supplierName: supplierName || '-',
        supplierTrn: '-',
        supplierInvoiceRefNumber: item.invoice_number || '-',
        taxableAmount,
        vatPercent,
        vatAmount,
        amountIncVat: taxableAmount + vatAmount,
        remarks: '',
      })
    }
  }

  return rows.sort((left, right) => {
    if (left.invoiceDate !== right.invoiceDate) {
      return left.invoiceDate.localeCompare(right.invoiceDate)
    }

    if (left.supplierName !== right.supplierName) {
      return left.supplierName.localeCompare(right.supplierName)
    }

    return left.supplierInvoiceRefNumber.localeCompare(right.supplierInvoiceRefNumber)
  })
}

export function formatVatDateLabel(value: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(date).replace(/ /g, '.')
}

function createEmptyCategoryRecord() {
  return {
    'domestic-taxable-sales': { taxableAmount: 0, vatAmount: 0 },
    'intra-gcc-sales': { taxableAmount: 0, vatAmount: 0 },
    'export-outside-gcc': { taxableAmount: 0, vatAmount: 0 },
    'domestic-taxable-purchase-with-vat': { taxableAmount: 0, vatAmount: 0 },
    'direct-pay-to-fta': { taxableAmount: 0, vatAmount: 0 },
    'unregistered-domestic-purchase': { taxableAmount: 0, vatAmount: 0 },
  }
}

function classifySalesCategory(
  geography: string | undefined,
  fallbackCountry: string
): VatSummaryCategoryKey {
  const normalizedGeography = String(geography || '').trim().toUpperCase()

  if (normalizedGeography === 'UAE') {
    return 'domestic-taxable-sales'
  }

  if (normalizedGeography === 'GCC') {
    return 'intra-gcc-sales'
  }

  if (normalizedGeography === 'OTHERS') {
    return 'export-outside-gcc'
  }

  if (!fallbackCountry || fallbackCountry === 'UNITED ARAB EMIRATES' || fallbackCountry === 'UAE') {
    return 'domestic-taxable-sales'
  }

  if (GCC_COUNTRIES.has(fallbackCountry)) {
    return 'intra-gcc-sales'
  }

  return 'export-outside-gcc'
}

function classifyPurchaseCategory({
  supplierName,
  vatAmount,
}: {
  supplierName: string
  vatAmount: number
}): VatSummaryCategoryKey {
  if (isFtaSupplierName(supplierName)) {
    return 'direct-pay-to-fta'
  }

  if (vatAmount > 0) {
    return 'domestic-taxable-purchase-with-vat'
  }

  return 'unregistered-domestic-purchase'
}

function normalizeCountry(value: string | undefined) {
  return String(value || '')
    .trim()
    .replace(/\./g, '')
    .toUpperCase()
}

function isDateInRange(value: string | null | undefined, fromDate: string, toDate: string) {
  if (!fromDate || !toDate || !value) {
    return false
  }

  return value >= fromDate && value <= toDate
}

function isFtaSupplierName(value: string) {
  return /(^|\b)(fta|federal tax authority)(\b|$)/i.test(value || '')
}

function toNumber(value: unknown) {
  const number =
    typeof value === 'string'
      ? Number(value.replace(/,/g, ''))
      : Number(value)

  return Number.isFinite(number) ? number : 0
}

const GCC_COUNTRIES = new Set([
  'BAHRAIN',
  'KUWAIT',
  'OMAN',
  'QATAR',
  'SAUDI ARABIA',
  'UNITED ARAB EMIRATES',
  'UAE',
])
