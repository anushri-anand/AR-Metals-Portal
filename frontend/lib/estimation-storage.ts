import { fetchAPI } from '@/lib/api'

export type MasterListItem = {
  id: string | number
  itemDescription: string
  unit: string
  rate: number
  poRefNumber: string
}

export type ClientData = {
  id: string | number
  clientName: string
  supplierTrnNo: string
  country: string
  city: string
  contactPerson: string
  mobileNumber: string
  companyTelNumber: string
  email: string
  remarks: string
}

export type TenderLog = {
  id: string | number
  tenderNumber: string
  quoteRef: string
  clientId?: string | number | null
  clientName: string
  contactName: string
  projectName: string
  projectLocation: string
  geography: GeographyType
  typeOfContract: ContractType
  tenderDate: string | null
  revisionNumber: string
  revisionDate: string | null
  description: string
  sellingAmount: number
  submissionDate: string | null
  status: string
  remarks: string
}

export type TenderLogInput = {
  tenderNumber: string
  quoteRef: string
  revisionNumber: string
  revisionDate: string | null
  clientId?: string | number | null
  projectName: string
  projectLocation: string
  geography: GeographyType
  typeOfContract: ContractType
  description: string
  sellingAmount: number
  tenderDate: string | null
  submissionDate: string | null
  status: string
  remarks: string
}

export const contractTypeOptions = [
  'Re-measurable',
  'Lumpsum',
  'Cost Plus',
] as const

export const geographyOptions = ['UAE', 'GCC', 'Others'] as const

export type ContractType = (typeof contractTypeOptions)[number]
export type GeographyType = (typeof geographyOptions)[number]

export type ContractRevenueVariation = {
  id?: string | number
  variationNumber: string
  amount: number
}

export type ContractRevenue = {
  id: string | number
  projectNumber: string
  projectName: string
  contractValue: number
  startDate: string | null
  completionDate: string | null
  budgetMaterial: number
  budgetMachining: number
  budgetCoating: number
  budgetConsumables: number
  budgetSubcontracts: number
  budgetProductionLabour: number
  budgetFreightCustom: number
  budgetInstallationLabour: number
  budgetPrelims: number
  budgetFoh: number
  budgetCommitments: number
  budgetContingencies: number
  variationBudgetMaterial: number
  variationBudgetMachining: number
  variationBudgetCoating: number
  variationBudgetConsumables: number
  variationBudgetSubcontracts: number
  variationBudgetProductionLabour: number
  variationBudgetFreightCustom: number
  variationBudgetInstallationLabour: number
  variationBudgetPrelims: number
  variationBudgetFoh: number
  variationBudgetCommitments: number
  variationBudgetContingencies: number
  variations: ContractRevenueVariation[]
}

export type ContractRevenueInput = Omit<ContractRevenue, 'id'>

export type ContractVariationStatus =
  (typeof contractVariationStatusOptions)[number]

export type ContractVariationLog = {
  id: string | number
  projectNumber: string
  projectName: string
  rfvNumber: string
  clientVariationNumber: string
  description: string
  documentRef: string
  submittedAmount: number
  armLetterRef: string
  submittedDate: string | null
  approvedAmount: number
  clientLetterRef: string
  approvedDate: string | null
  status: ContractVariationStatus | string
  remarks: string
}

export type ContractVariationLogInput = Omit<ContractVariationLog, 'id'>

export type ContractPaymentLog = {
  id: string | number
  projectNumber: string
  projectName: string
  sn: number
  submittedDate: string | null
  approvedDate: string | null
  submittedAdvance: number
  submittedRecoveryAdvance: number
  grossSubmittedAmount: number
  submittedRetention: number
  submittedReleaseRetention: number
  netSubmittedAmount: number
  submittedVat: number
  submittedVatAmount: number
  netSubmittedIncVat: number
  approvedAdvance: number
  approvedRecoveryAdvance: number
  grossApprovedAmount: number
  approvedRetention: number
  approvedReleaseRetention: number
  netApprovedAmount: number
  approvedVat: number
  approvedVatAmount: number
  netApprovedIncVat: number
  dueDate: string | null
  paidDate: string | null
  paidAmount: number
  forecastDate: string | null
}

export type ContractPaymentLogInput = Omit<ContractPaymentLog, 'id'>

export type CostingRevisionSnapshot = {
  id: number
  tenderNumber: string
  projectName: string
  revisionNumber: string
  status: 'submitted' | 'approved'
  submittedBy: string
  approvedBy: string
  submittedAt: string
  approvedAt: string | null
}

export type BoqItem = {
  id: string | number
  sn: string
  tenderNumber: string
  revisionNumber: string
  revisionDate: string | null
  clientsBoq: string
  package: string
  description: string
  quantity: number
  unit: string
  freightCustomDutyPercent: number
  prelimsPercent: number
  fohPercent: number
  commitmentsPercent: number
  contingenciesPercent: number
  markup: number
}

export type EstimateItem = {
  itemId: string | number
  quantity: number
}

export type EstimateItemWithWastage = EstimateItem & {
  wastagePercent: number
}

export type LabourHours = {
  skilledHours: number
  semiSkilledHours: number
  helperHours: number
}

export const labourStageNames = [
  'Cutting',
  'Grooving',
  'Bending',
  'Fabrication',
  'Welding',
  'Finishing',
  'Assembly',
  'Packing',
] as const

export type LabourStageName = (typeof labourStageNames)[number]

export type ProductionLabourDetails = Record<LabourStageName, LabourHours>

export type LabourDetails = ProductionLabourDetails

export type TenderCosting = {
  id: string | number
  boqItemId: string | number
  tenderNumber: string
  material: EstimateItemWithWastage[]
  productionLabour: LabourDetails
  machining: EstimateItem[]
  coating: EstimateItem[]
  consumable: EstimateItemWithWastage[]
  subcontract: EstimateItem[]
  installationLabour: LabourHours
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function getClientData(): Promise<ClientData[]> {
  return fetchAPI('/estimation/client-data/')
}

export async function createClientData(
  item: Omit<ClientData, 'id'>
): Promise<ClientData> {
  return fetchAPI('/estimation/client-data/', {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

export async function getTenderLogs(): Promise<TenderLog[]> {
  const tenders = await fetchAPI('/estimation/tender-log/')

  return tenders.map(normalizeTenderLog)
}

export async function createTenderLog(
  item: TenderLogInput
): Promise<TenderLog> {
  return normalizeTenderLog(
    await fetchAPI('/estimation/tender-log/', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  )
}

export async function getContractRevenues(): Promise<ContractRevenue[]> {
  const revenues = await fetchAPI('/estimation/contract/revenue/')

  return revenues.map(normalizeContractRevenue)
}

export async function createContractRevenue(
  item: ContractRevenueInput
): Promise<ContractRevenue> {
  return normalizeContractRevenue(
    await fetchAPI('/estimation/contract/revenue/', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  )
}

export async function getContractVariationLogs(): Promise<ContractVariationLog[]> {
  const logs = await fetchAPI('/estimation/contract/variation-log/')

  return logs.map(normalizeContractVariationLog)
}

export async function createContractVariationLog(
  item: ContractVariationLogInput
): Promise<ContractVariationLog> {
  return normalizeContractVariationLog(
    await fetchAPI('/estimation/contract/variation-log/', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  )
}

export async function getContractPaymentLogs(): Promise<ContractPaymentLog[]> {
  const logs = await fetchAPI('/estimation/contract/payment-log/')

  return logs.map(normalizeContractPaymentLog)
}

export async function createContractPaymentLog(
  item: ContractPaymentLogInput
): Promise<ContractPaymentLog> {
  return normalizeContractPaymentLog(
    await fetchAPI('/estimation/contract/payment-log/', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  )
}

export async function getCostingRevisionSnapshots(): Promise<CostingRevisionSnapshot[]> {
  const snapshots = await fetchAPI('/estimation/costing-snapshots/')

  return snapshots.map(normalizeCostingRevisionSnapshot)
}

export async function submitCostingRevisionSnapshot(input: {
  tenderNumber: string
  projectName: string
  revisionNumber: string
}): Promise<CostingRevisionSnapshot> {
  return normalizeCostingRevisionSnapshot(
    await fetchAPI('/estimation/costing-snapshots/', {
      method: 'POST',
      body: JSON.stringify({
        tender_number: input.tenderNumber,
        project_name: input.projectName,
        revision_number: input.revisionNumber,
      }),
    })
  )
}

export async function approveCostingRevisionSnapshot(
  id: number
): Promise<CostingRevisionSnapshot> {
  return normalizeCostingRevisionSnapshot(
    await fetchAPI(`/estimation/costing-snapshots/${id}/approve/`, {
      method: 'POST',
    })
  )
}

export async function updateTenderLog(
  id: string | number,
  data: Partial<TenderLog>
): Promise<TenderLog> {
  return normalizeTenderLog(
    await fetchAPI(`/estimation/tender-log/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  )
}

export async function getMasterListItems(): Promise<MasterListItem[]> {
  return fetchAPI('/estimation/master-list/')
}

export async function createMasterListItem(
  item: Omit<MasterListItem, 'id'>
): Promise<MasterListItem> {
  return fetchAPI('/estimation/master-list/', {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

export async function deleteMasterListItem(id: string | number) {
  return fetchAPI(`/estimation/master-list/${id}/`, {
    method: 'DELETE',
  })
}

export async function updateMasterListItem(
  id: string | number,
  data: Partial<MasterListItem>
): Promise<MasterListItem> {
  return fetchAPI(`/estimation/master-list/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getBoqItems(): Promise<BoqItem[]> {
  const items = await fetchAPI('/estimation/boq-items/')

  return items.map(normalizeBoqItem)
}

export async function saveBoqItems(items: BoqItem[]): Promise<BoqItem[]> {
  const savedItems = await fetchAPI('/estimation/boq-items/bulk-save/', {
    method: 'POST',
    body: JSON.stringify({
      rows: items.map((item) => ({
        ...item,
        id: typeof item.id === 'number' ? item.id : undefined,
      })),
    }),
  })

  return savedItems.map(normalizeBoqItem)
}

export async function updateBoqItem(
  id: string | number,
  data: Partial<BoqItem>
): Promise<BoqItem> {
  const item = await fetchAPI(`/estimation/boq-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

  return normalizeBoqItem(item)
}

export async function getTenderCostings(): Promise<TenderCosting[]> {
  const costings = await fetchAPI('/estimation/costings/')

  return costings.map(normalizeTenderCosting)
}

export async function getTenderCosting(
  boqItemId: string | number
): Promise<TenderCosting | null> {
  try {
    return normalizeTenderCosting(
      await fetchAPI(`/estimation/costings/${boqItemId}/`)
    )
  } catch {
    return null
  }
}

export async function saveTenderCosting(
  costing: TenderCosting
): Promise<TenderCosting> {
  return normalizeTenderCosting(
    await fetchAPI(`/estimation/costings/${costing.boqItemId}/`, {
      method: 'POST',
      body: JSON.stringify(costing),
    })
  )
}

export function createEmptyEstimateItem(): EstimateItem {
  return {
    itemId: '',
    quantity: 0,
  }
}

export function createEmptyEstimateItemWithWastage(): EstimateItemWithWastage {
  return {
    itemId: '',
    quantity: 0,
    wastagePercent: 0,
  }
}

export function createEmptyLabourHours(): LabourHours {
  return {
    skilledHours: 0,
    semiSkilledHours: 0,
    helperHours: 0,
  }
}

export function createEmptyLabourDetails(): LabourDetails {
  return labourStageNames.reduce((details, stageName) => {
    details[stageName] = createEmptyLabourHours()

    return details
  }, {} as LabourDetails)
}

export function createEmptyTenderCosting(
  boqItemId: string | number,
  tenderNumber: string
): TenderCosting {
  return {
    id: createId('costing'),
    boqItemId,
    tenderNumber,
    material: [createEmptyEstimateItemWithWastage()],
    productionLabour: createEmptyLabourDetails(),
    machining: [createEmptyEstimateItem()],
    coating: [createEmptyEstimateItem()],
    consumable: [createEmptyEstimateItemWithWastage()],
    subcontract: [createEmptyEstimateItem()],
    installationLabour: createEmptyLabourHours(),
  }
}

export function getMasterItem(
  masterItems: MasterListItem[],
  itemId: string | number
) {
  return masterItems.find((item) => String(item.id) === String(itemId))
}

export function getEstimateItemAmount(
  value: EstimateItem,
  masterItems: MasterListItem[]
) {
  const item = getMasterItem(masterItems, value.itemId)

  return toNumber(value.quantity) * toNumber(item?.rate)
}

export function getEstimateItemWithWastageQuantity(
  value: EstimateItemWithWastage
) {
  const quantity = toNumber(value.quantity)

  return quantity + quantity * (toNumber(value.wastagePercent) / 100)
}

export function getEstimateItemWithWastageAmount(
  value: EstimateItemWithWastage,
  masterItems: MasterListItem[]
) {
  const item = getMasterItem(masterItems, value.itemId)

  return getEstimateItemWithWastageQuantity(value) * toNumber(item?.rate)
}

export function getEstimateItemsAmount(
  values: EstimateItem[],
  masterItems: MasterListItem[]
) {
  return values.reduce(
    (total, item) => total + getEstimateItemAmount(item, masterItems),
    0
  )
}

export function getEstimateItemsWithWastageAmount(
  values: EstimateItemWithWastage[],
  masterItems: MasterListItem[]
) {
  return values.reduce(
    (total, item) => total + getEstimateItemWithWastageAmount(item, masterItems),
    0
  )
}

export function getProductionLabourUnitCost(
  value: ProductionLabourDetails,
  masterItems: MasterListItem[]
) {
  return labourStageNames.reduce((stageTotal, stageName) => {
    const stage = value[stageName]
    const skilledRate = getLabourRate(masterItems, 'skilled')
    const semiSkilledRate = getLabourRate(masterItems, 'semiSkilled')
    const helperRate = getLabourRate(masterItems, 'helper')

    return (
      stageTotal +
      toNumber(stage.skilledHours) * skilledRate +
      toNumber(stage.semiSkilledHours) * semiSkilledRate +
      toNumber(stage.helperHours) * helperRate
    )
  }, 0)
}

export function getInstallationLabourUnitCost(
  value: LabourHours,
  masterItems: MasterListItem[]
) {
  const skilledRate = getLabourRate(masterItems, 'skilled')
  const semiSkilledRate = getLabourRate(masterItems, 'semiSkilled')
  const helperRate = getLabourRate(masterItems, 'helper')

  return (
    toNumber(value.skilledHours) * skilledRate +
    toNumber(value.semiSkilledHours) * semiSkilledRate +
    toNumber(value.helperHours) * helperRate
  )
}

export function calculateCostSummary({
  boqQuantity,
  costing,
  freightCustomDutyPercent,
  prelimsPercent,
  fohPercent,
  commitmentsPercent,
  contingenciesPercent,
  markup,
  masterItems,
}: {
  boqQuantity: number
  costing: TenderCosting
  freightCustomDutyPercent: number
  prelimsPercent: number
  fohPercent: number
  commitmentsPercent: number
  contingenciesPercent: number
  markup: number
  masterItems: MasterListItem[]
}) {
  const materialUnitCost = getEstimateItemsWithWastageAmount(
    costing.material,
    masterItems
  )
  const productionLabourUnitCost = getProductionLabourUnitCost(
    costing.productionLabour,
    masterItems
  )
  const machiningUnitCost = getEstimateItemsAmount(costing.machining, masterItems)
  const coatingUnitCost = getEstimateItemsAmount(costing.coating, masterItems)
  const consumableUnitCost = getEstimateItemsWithWastageAmount(
    costing.consumable,
    masterItems
  )
  const subcontractUnitCost = getEstimateItemsAmount(
    costing.subcontract,
    masterItems
  )
  const installationLabourUnitCost = getInstallationLabourUnitCost(
    costing.installationLabour,
    masterItems
  )
  const supplyUnitCost =
    materialUnitCost +
    productionLabourUnitCost +
    machiningUnitCost +
    coatingUnitCost +
    consumableUnitCost +
    subcontractUnitCost
  const installationUnitCost = installationLabourUnitCost
  const supplyTotalCost = supplyUnitCost * toNumber(boqQuantity)
  const installationTotalCost = installationUnitCost * toNumber(boqQuantity)
  const baseUnitCost = supplyUnitCost + installationUnitCost
  const indirectPercentTotal =
    toNumber(fohPercent) +
    toNumber(commitmentsPercent) +
    toNumber(contingenciesPercent)
  const freightCustomUnitCost =
    baseUnitCost * (toNumber(freightCustomDutyPercent) / 100)
  const prelimsUnitCost = baseUnitCost * (toNumber(prelimsPercent) / 100)
  const percentageUnitCost = freightCustomUnitCost + prelimsUnitCost
  const unitCost = baseUnitCost + percentageUnitCost
  const totalCost = unitCost * toNumber(boqQuantity)
  const sellingRate = unitCost * toNumber(markup)
  const sellingAmount = sellingRate * toNumber(boqQuantity)

  return {
    materialUnitCost,
    productionLabourUnitCost,
    machiningUnitCost,
    coatingUnitCost,
    consumableUnitCost,
    subcontractUnitCost,
    installationLabourUnitCost,
    freightCustomUnitCost,
    prelimsUnitCost,
    indirectPercentTotal,
    supplyUnitCost,
    supplyTotalCost,
    installationUnitCost,
    installationTotalCost,
    percentageUnitCost,
    baseUnitCost,
    unitCost,
    totalCost,
    sellingRate,
    sellingAmount,
  }
}

export function formatMoney(value: number) {
  return toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const tenderStatusOptions = [
  'Submitted & Awaiting',
  'Awarded to ARM',
  'Awarded to Others',
  'Changed to VO',
  'Cancelled',
  'Regretted',
  'To Revise & Re-submit',
  'Under Pricing',
] as const

export type TenderStatus = (typeof tenderStatusOptions)[number]

export const contractVariationStatusOptions = [
  'Agreed',
  'Submitted',
  'To be Submitted',
  'Rejected',
  'Disputed',
  'Cancelled',
] as const

function toNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

function normalizeTenderLog(item: TenderLog): TenderLog {
  return {
    ...item,
    quoteRef: item.quoteRef || '',
    contactName: item.contactName || '',
    projectLocation: item.projectLocation || '',
    geography: (item.geography as GeographyType) || geographyOptions[0],
    typeOfContract:
      (item.typeOfContract as ContractType) || contractTypeOptions[0],
    revisionNumber: item.revisionNumber || '',
    revisionDate: item.revisionDate || null,
    description: item.description || '',
    sellingAmount: toNumber(item.sellingAmount),
  }
}

function normalizeBoqItem(item: BoqItem): BoqItem {
  return {
    ...item,
    package: item.package || '',
    revisionNumber: item.revisionNumber || '',
    revisionDate: item.revisionDate || null,
    quantity: toNumber(item.quantity),
    freightCustomDutyPercent: toNumber(item.freightCustomDutyPercent),
    prelimsPercent: toNumber(item.prelimsPercent),
    fohPercent: toNumber(item.fohPercent),
    commitmentsPercent: toNumber(item.commitmentsPercent),
    contingenciesPercent: toNumber(item.contingenciesPercent),
    markup: toNumber(item.markup),
  }
}

function normalizeCostingRevisionSnapshot(
  item: Record<string, unknown>
): CostingRevisionSnapshot {
  return {
    id: Number(item.id || 0),
    tenderNumber: String(item.tender_number || item.tenderNumber || ''),
    projectName: String(item.project_name || item.projectName || ''),
    revisionNumber: String(item.revision_number || item.revisionNumber || ''),
    status:
      String(item.status || 'submitted') === 'approved' ? 'approved' : 'submitted',
    submittedBy: String(item.submitted_by || item.submittedBy || ''),
    approvedBy: String(item.approved_by || item.approvedBy || ''),
    submittedAt: String(item.submitted_at || item.submittedAt || ''),
    approvedAt:
      item.approved_at || item.approvedAt
        ? String(item.approved_at || item.approvedAt)
        : null,
  }
}

function normalizeTenderCosting(item: TenderCosting): TenderCosting {
  return {
    ...item,
    material: normalizeEstimateItemsWithWastage(item.material),
    productionLabour: normalizeProductionLabour(item.productionLabour),
    machining: normalizeEstimateItems(item.machining),
    coating: normalizeEstimateItems(item.coating),
    consumable: normalizeEstimateItemsWithWastage(item.consumable),
    subcontract: normalizeEstimateItems(item.subcontract),
    installationLabour: normalizeLabourHours(item.installationLabour),
  }
}

function normalizeContractRevenue(item: ContractRevenue): ContractRevenue {
  return {
    ...item,
    contractValue: toNumber(item.contractValue),
    startDate: item.startDate || null,
    completionDate: item.completionDate || null,
    budgetMaterial: toNumber(item.budgetMaterial),
    budgetMachining: toNumber(item.budgetMachining),
    budgetCoating: toNumber(item.budgetCoating),
    budgetConsumables: toNumber(item.budgetConsumables),
    budgetSubcontracts: toNumber(item.budgetSubcontracts),
    budgetProductionLabour: toNumber(item.budgetProductionLabour),
    budgetFreightCustom: toNumber(item.budgetFreightCustom),
    budgetInstallationLabour: toNumber(item.budgetInstallationLabour),
    budgetPrelims: toNumber(item.budgetPrelims),
    budgetFoh: toNumber(item.budgetFoh),
    budgetCommitments: toNumber(item.budgetCommitments),
    budgetContingencies: toNumber(item.budgetContingencies),
    variationBudgetMaterial: toNumber(item.variationBudgetMaterial),
    variationBudgetMachining: toNumber(item.variationBudgetMachining),
    variationBudgetCoating: toNumber(item.variationBudgetCoating),
    variationBudgetConsumables: toNumber(item.variationBudgetConsumables),
    variationBudgetSubcontracts: toNumber(item.variationBudgetSubcontracts),
    variationBudgetProductionLabour: toNumber(item.variationBudgetProductionLabour),
    variationBudgetFreightCustom: toNumber(item.variationBudgetFreightCustom),
    variationBudgetInstallationLabour: toNumber(
      item.variationBudgetInstallationLabour
    ),
    variationBudgetPrelims: toNumber(item.variationBudgetPrelims),
    variationBudgetFoh: toNumber(item.variationBudgetFoh),
    variationBudgetCommitments: toNumber(item.variationBudgetCommitments),
    variationBudgetContingencies: toNumber(item.variationBudgetContingencies),
    variations: (item.variations || []).map((variation) => ({
      ...variation,
      amount: toNumber(variation.amount),
    })),
  }
}

function normalizeContractVariationLog(
  item: ContractVariationLog
): ContractVariationLog {
  return {
    ...item,
    rfvNumber: item.rfvNumber || '',
    clientVariationNumber: item.clientVariationNumber || '',
    description: item.description || '',
    documentRef: item.documentRef || '',
    submittedAmount: toNumber(item.submittedAmount),
    armLetterRef: item.armLetterRef || '',
    submittedDate: item.submittedDate || null,
    approvedAmount: toNumber(item.approvedAmount),
    clientLetterRef: item.clientLetterRef || '',
    approvedDate: item.approvedDate || null,
    remarks: item.remarks || '',
  }
}

function normalizeContractPaymentLog(item: ContractPaymentLog): ContractPaymentLog {
  return {
    ...item,
    sn: toNumber(item.sn),
    submittedDate: item.submittedDate || null,
    approvedDate: item.approvedDate || null,
    submittedAdvance: toNumber(item.submittedAdvance),
    submittedRecoveryAdvance: toNumber(item.submittedRecoveryAdvance),
    grossSubmittedAmount: toNumber(item.grossSubmittedAmount),
    submittedRetention: toNumber(item.submittedRetention),
    submittedReleaseRetention: toNumber(item.submittedReleaseRetention),
    netSubmittedAmount: toNumber(item.netSubmittedAmount),
    submittedVat: toNumber(item.submittedVat),
    submittedVatAmount: toNumber(item.submittedVatAmount),
    netSubmittedIncVat: toNumber(item.netSubmittedIncVat),
    approvedAdvance: toNumber(item.approvedAdvance),
    approvedRecoveryAdvance: toNumber(item.approvedRecoveryAdvance),
    grossApprovedAmount: toNumber(item.grossApprovedAmount),
    approvedRetention: toNumber(item.approvedRetention),
    approvedReleaseRetention: toNumber(item.approvedReleaseRetention),
    netApprovedAmount: toNumber(item.netApprovedAmount),
    approvedVat: toNumber(item.approvedVat),
    approvedVatAmount: toNumber(item.approvedVatAmount),
    netApprovedIncVat: toNumber(item.netApprovedIncVat),
    dueDate: item.dueDate || null,
    paidDate: item.paidDate || null,
    paidAmount: toNumber(item.paidAmount),
    forecastDate: item.forecastDate || null,
  }
}

function normalizeEstimateItems(
  value: EstimateItem[] | EstimateItem | undefined | null
): EstimateItem[] {
  const items = Array.isArray(value) ? value : value ? [value] : []
  const normalizedItems = items.map((item) => ({
    itemId: item?.itemId || '',
    quantity: toNumber(item?.quantity),
  }))

  return normalizedItems.length > 0 ? normalizedItems : [createEmptyEstimateItem()]
}

function normalizeEstimateItemsWithWastage(
  value: EstimateItemWithWastage[] | EstimateItemWithWastage | undefined | null
): EstimateItemWithWastage[] {
  const items = Array.isArray(value) ? value : value ? [value] : []
  const normalizedItems = items.map((item) => ({
    itemId: item?.itemId || '',
    quantity: toNumber(item?.quantity),
    wastagePercent: toNumber(item?.wastagePercent),
  }))

  return normalizedItems.length > 0
    ? normalizedItems
    : [createEmptyEstimateItemWithWastage()]
}

function normalizeProductionLabour(
  value: ProductionLabourDetails | Record<string, unknown> | undefined | null
): ProductionLabourDetails {
  return labourStageNames.reduce((details, stageName) => {
    details[stageName] = normalizeLabourHours(
      (value as Record<string, LabourHours | undefined> | undefined)?.[stageName]
    )

    return details
  }, {} as ProductionLabourDetails)
}

function normalizeLabourHours(
  value: LabourHours | Record<string, unknown> | undefined | null
): LabourHours {
  return {
    skilledHours: toNumber(value?.skilledHours),
    semiSkilledHours: toNumber(value?.semiSkilledHours),
    helperHours: toNumber(value?.helperHours),
  }
}

function getLabourRate(
  masterItems: MasterListItem[],
  role: 'skilled' | 'semiSkilled' | 'helper'
) {
  const roleNames =
    role === 'skilled'
      ? ['skilled labour']
      : role === 'semiSkilled'
        ? ['semi skilled labour', 'semi-skilled labour', 'semiskilled labour']
        : ['helper', 'helper labour']

  const match = masterItems.find((item) =>
    roleNames.includes(item.itemDescription.trim().toLowerCase())
  )

  return toNumber(match?.rate)
}
