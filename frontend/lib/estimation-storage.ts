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
  tenderName: string
  quoteRef: string
  clientId?: string | number | null
  clientName: string
  contactName: string
  projectName: string
  projectLocation: string
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
  tenderName: string
  quoteRef: string
  clientId?: string | number | null
  projectName: string
  projectLocation: string
  tenderDate: string | null
  submissionDate: string | null
  status: string
  remarks: string
}

export type BoqItem = {
  id: string | number
  sn: string
  tenderNumber: string
  revisionNumber: string
  revisionDate: string | null
  clientsBoq: string
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

export type LabourValue = {
  itemId: string | number
  hours: number
}

export const labourStageNames = [
  'Cutting',
  'Grooving',
  'Bending',
  'Fabrication',
  'Welding',
  'Finishing',
  'Coating',
  'Assembly',
  'Installation',
  'Packing',
] as const

export type LabourStageName = (typeof labourStageNames)[number]

export type ProductionLabourDetails = Record<LabourStageName, LabourValue>

export type LabourDetails = ProductionLabourDetails

export type TenderCosting = {
  id: string | number
  boqItemId: string | number
  tenderNumber: string
  material: EstimateItemWithWastage
  productionLabour: LabourDetails
  machining: EstimateItem
  coating: EstimateItem
  consumable: EstimateItemWithWastage
  subcontract: EstimateItem
  installationLabour: LabourValue
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
  return fetchAPI('/estimation/costings/')
}

export async function getTenderCosting(
  boqItemId: string | number
): Promise<TenderCosting | null> {
  try {
    return await fetchAPI(`/estimation/costings/${boqItemId}/`)
  } catch {
    return null
  }
}

export async function saveTenderCosting(
  costing: TenderCosting
): Promise<TenderCosting> {
  return fetchAPI(`/estimation/costings/${costing.boqItemId}/`, {
    method: 'POST',
    body: JSON.stringify(costing),
  })
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

export function createEmptyLabourValue(): LabourValue {
  return {
    itemId: '',
    hours: 0,
  }
}

export function createEmptyLabourDetails(): LabourDetails {
  return labourStageNames.reduce((details, stageName) => {
    details[stageName] = createEmptyLabourValue()

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
    material: createEmptyEstimateItemWithWastage(),
    productionLabour: createEmptyLabourDetails(),
    machining: createEmptyEstimateItem(),
    coating: createEmptyEstimateItem(),
    consumable: createEmptyEstimateItemWithWastage(),
    subcontract: createEmptyEstimateItem(),
    installationLabour: createEmptyLabourValue(),
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

export function getProductionLabourUnitCost(
  value: ProductionLabourDetails,
  masterItems: MasterListItem[]
) {
  return labourStageNames.reduce((stageTotal, stageName) => {
    const stage = value[stageName]
    const item = getMasterItem(masterItems, stage.itemId)

    return stageTotal + toNumber(stage.hours) * toNumber(item?.rate)
  }, 0)
}

export function getInstallationLabourUnitCost(
  value: LabourValue,
  masterItems: MasterListItem[]
) {
  const item = getMasterItem(masterItems, value.itemId)

  return toNumber(value.hours) * toNumber(item?.rate)
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
  const materialUnitCost = getEstimateItemWithWastageAmount(
    costing.material,
    masterItems
  )
  const productionLabourUnitCost = getProductionLabourUnitCost(
    costing.productionLabour,
    masterItems
  )
  const machiningUnitCost = getEstimateItemAmount(costing.machining, masterItems)
  const coatingUnitCost = getEstimateItemAmount(costing.coating, masterItems)
  const consumableUnitCost = getEstimateItemWithWastageAmount(
    costing.consumable,
    masterItems
  )
  const subcontractUnitCost = getEstimateItemAmount(costing.subcontract, masterItems)
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
  const costPercentage =
    toNumber(freightCustomDutyPercent) +
    toNumber(prelimsPercent) +
    toNumber(fohPercent) +
    toNumber(commitmentsPercent) +
    toNumber(contingenciesPercent)
  const percentageUnitCost = baseUnitCost * (costPercentage / 100)
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
    revisionNumber: item.revisionNumber || '',
    revisionDate: item.revisionDate || null,
    description: item.description || '',
    sellingAmount: toNumber(item.sellingAmount),
  }
}

function normalizeBoqItem(item: BoqItem): BoqItem {
  return {
    ...item,
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
