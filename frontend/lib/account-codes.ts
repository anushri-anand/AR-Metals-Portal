export const fohAccountCodeOptions = [
  'Staff Cost',
  'Electricity & Water',
  'Vehicle Running Expenses',
  'Salik, Gate Pass, Parking, Fines',
  'Vehicle Depreciation',
  'Vehicle Rent',
  'Office Furniture Depreciation',
  'Office Equipment',
  'Mobile, Telephone & Internet Expenses',
  'Safety Equipment',
  'Warehouse Rent',
  'Warehouse Expenses',
  'Machinery Depreciation',
  'Repair & Maintenance',
  'Stationery & Printing',
  'License Renewal',
  'Legal & Professional Fee',
  'Marketing & Advertising',
  'Govt Fees',
  'Pantry Expenses',
  'Travel Expenses',
  'Bank Charges',
  'Loading & Unloading Charges',
  'Post & Courier',
  'Small tools & Machineries',
  'Miscellaneous',
] as const

export type FohAccountCode = (typeof fohAccountCodeOptions)[number]

export function requiresManualAccountCode(costCode: string) {
  return String(costCode || '').trim() === 'FOH'
}

export function getAccountCodeOptions(costCode: string) {
  return requiresManualAccountCode(costCode)
    ? [...fohAccountCodeOptions]
    : costCode
      ? [costCode]
      : []
}

export function normalizeAccountCode(costCode: string, accountCode: string) {
  const trimmedCostCode = String(costCode || '').trim()
  const trimmedAccountCode = String(accountCode || '').trim()

  if (!trimmedCostCode) {
    return trimmedAccountCode
  }

  if (requiresManualAccountCode(trimmedCostCode)) {
    return trimmedAccountCode
  }

  return trimmedCostCode
}

export function getDefaultAccountCode(costCode: string) {
  return requiresManualAccountCode(costCode) ? '' : String(costCode || '').trim()
}
