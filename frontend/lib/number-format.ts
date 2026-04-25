type NumericValue = number | string | null | undefined

type FormatOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

const partialNumberPattern = /^-?(?:\d+)?(?:\.\d*)?$/

export function toNumber(value: NumericValue) {
  const parsed = Number(
    typeof value === 'string' ? stripIndianNumberFormatting(value) : value
  )

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatIndianNumber(
  value: NumericValue,
  options: FormatOptions = {}
) {
  return toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  })
}

export function formatIndianMoney(value: NumericValue) {
  return formatIndianNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatIndianQuantity(value: NumericValue) {
  return formatIndianNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

export function formatIndianPercent(
  value: NumericValue,
  maximumFractionDigits = 2
) {
  return formatIndianNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

export function stripIndianNumberFormatting(value: string) {
  return value.replace(/,/g, '').trim()
}

export function isCompleteNumericValue(value: string) {
  const rawValue = stripIndianNumberFormatting(value)

  if (!rawValue || !partialNumberPattern.test(rawValue)) {
    return false
  }

  return !rawValue.endsWith('.') && rawValue !== '-' && rawValue !== '-.'
}

export function formatIndianInputValue(value: string) {
  const rawValue = stripIndianNumberFormatting(value)

  if (!rawValue || !partialNumberPattern.test(rawValue)) {
    return value
  }

  const isNegative = rawValue.startsWith('-')
  const unsignedValue = isNegative ? rawValue.slice(1) : rawValue
  const [integerPartRaw, fractionalPart] = unsignedValue.split('.')
  const integerPart = (integerPartRaw || '0').replace(/^0+(?=\d)/, '') || '0'
  const groupedInteger = groupWesternInteger(integerPart)
  const formattedValue = fractionalPart ? `${groupedInteger}.${fractionalPart}` : groupedInteger

  return `${isNegative ? '-' : ''}${formattedValue}`
}

function groupWesternInteger(value: string) {
  const sanitized = value.replace(/\D/g, '')

  return sanitized.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
