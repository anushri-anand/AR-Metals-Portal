export const ALL_VARIATIONS_VALUE = '__ALL__'
export const BASE_PROJECT_LABEL = 'Base Project'
export const ALL_VARIATIONS_LABEL = 'All'

export function normalizeVariationNumber(value: string | null | undefined) {
  const text = String(value || '').trim()

  if (!text || text.toLowerCase() === BASE_PROJECT_LABEL.toLowerCase()) {
    return ''
  }

  if (text === ALL_VARIATIONS_VALUE) {
    return ALL_VARIATIONS_VALUE
  }

  const numbers = text.match(/\d+/g)

  if (numbers?.length) {
    return `RFV #${Number(numbers.at(-1))}`
  }

  return text
}

export function compareVariationNumbers(left: string, right: string) {
  const normalizedLeft = normalizeVariationNumber(left)
  const normalizedRight = normalizeVariationNumber(right)

  if (normalizedLeft === ALL_VARIATIONS_VALUE) return -1
  if (normalizedRight === ALL_VARIATIONS_VALUE) return 1
  if (!normalizedLeft) return -1
  if (!normalizedRight) return 1

  const leftNumbers = normalizedLeft.match(/\d+/g)
  const rightNumbers = normalizedRight.match(/\d+/g)
  const leftNumber = leftNumbers ? Number(leftNumbers.at(-1)) : -1
  const rightNumber = rightNumbers ? Number(rightNumbers.at(-1)) : -1

  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }

  return normalizedLeft.localeCompare(normalizedRight)
}

export function getVariationDisplayLabel(value: string | null | undefined) {
  const normalizedValue = normalizeVariationNumber(value)

  if (!normalizedValue) {
    return BASE_PROJECT_LABEL
  }

  if (normalizedValue === ALL_VARIATIONS_VALUE) {
    return ALL_VARIATIONS_LABEL
  }

  return normalizedValue
}
