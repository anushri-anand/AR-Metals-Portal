const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function formatDateDdMmmYy(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const normalized = String(value).trim()

  if (!normalized) {
    return '-'
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!match) {
    return normalized
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const day = Number(dayText)
  const parsed = new Date(Date.UTC(year, monthIndex, day))

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    return normalized
  }

  return `${String(day).padStart(2, '0')}-${SHORT_MONTHS[monthIndex]}-${String(year).slice(-2)}`
}
