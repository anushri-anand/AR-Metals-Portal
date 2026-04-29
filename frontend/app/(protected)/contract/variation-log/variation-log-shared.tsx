'use client'

import { ReactNode } from 'react'
import { formatDateDdMmmYy } from '@/lib/date-format'
import {
  compareVariationNumbers,
  normalizeVariationNumber,
} from '@/lib/variation-number'
import {
  BoqItem,
  ContractVariationLog,
  contractVariationStatusOptions,
  MasterListItem,
  TenderCosting,
  calculateCostSummary,
} from '@/lib/estimation-storage'

export type VariationProjectOption = {
  id: number
  project_name: string
  project_number: string
  tender_number?: string
  revision_number?: string
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  )
}

export function buildVariationSummaryRows(logs: ContractVariationLog[]) {
  return contractVariationStatusOptions.map((status) => {
    const statusLogs = logs.filter((log) => log.status === status)

    return {
      status,
      submittedAmount: statusLogs.reduce(
        (total, log) => total + log.submittedAmount,
        0
      ),
      approvedAmount: statusLogs.reduce(
        (total, log) => total + log.approvedAmount,
        0
      ),
      count: statusLogs.length,
    }
  })
}

export function formatVariationDate(value: string | null) {
  return formatDateDdMmmYy(value)
}

export function toNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

export function getRfvOptionsForProject(
  logs: ContractVariationLog[],
  projectNumber: string
) {
  return Array.from(
    new Set(
      logs
        .filter((log) => log.projectNumber === projectNumber)
        .map((log) => normalizeVariationNumber(log.rfvNumber))
        .filter(Boolean)
    )
  ).sort(compareVariationNumbers)
}

export function getLatestVariationLog(
  logs: ContractVariationLog[],
  projectNumber: string,
  rfvNumber: string
) {
  return logs
    .filter(
      (log) =>
        log.projectNumber === projectNumber &&
        normalizeVariationNumber(log.rfvNumber) ===
          normalizeVariationNumber(rfvNumber)
    )
    .sort((left, right) => Number(right.id) - Number(left.id))[0] || null
}

export function getVariationNumberLabel(log: ContractVariationLog | null) {
  if (!log) return ''
  return log.clientVariationNumber.trim() || log.rfvNumber.trim()
}

export function getLatestVariationSubmittedAmount({
  projectNumber,
  rfvNumber,
  clientVariationNumber,
  logs,
  projectOptions,
  boqItems,
  costings,
  masterItems,
}: {
  projectNumber: string
  rfvNumber: string
  clientVariationNumber: string
  logs: ContractVariationLog[]
  projectOptions: VariationProjectOption[]
  boqItems: BoqItem[]
  costings: TenderCosting[]
  masterItems: MasterListItem[]
}) {
  const latestLog = getLatestVariationLog(logs, projectNumber, rfvNumber)
  const selectedProject = projectOptions.find(
    (project) => project.project_number === projectNumber
  )
  const variationNumber =
    normalizeVariationNumber(rfvNumber) ||
    clientVariationNumber.trim() ||
    latestLog?.clientVariationNumber.trim()

  if (!selectedProject?.tender_number || !variationNumber) {
    return latestLog?.submittedAmount || 0
  }

  const candidateRows = boqItems.filter(
    (row) =>
      row.tenderNumber === selectedProject.tender_number &&
      (row.variationNumber || '').trim() === variationNumber
  )

  if (candidateRows.length === 0) {
    return latestLog?.submittedAmount || 0
  }

  const latestRevision =
    [...new Set(candidateRows.map((row) => String(row.revisionNumber || '').trim()))]
      .sort(compareRevisionNumbers)
      .at(-1) || ''

  const latestRows = candidateRows.filter(
    (row) => String(row.revisionNumber || '').trim() === latestRevision
  )

  const totalSellingAmount = latestRows.reduce((total, row) => {
    const costing = costings.find(
      (item) => String(item.boqItemId) === String(row.id)
    )

    if (!costing) {
      return total
    }

    const summary = calculateCostSummary({
      boqQuantity: row.quantity,
      costing,
      freightCustomDutyPercent: row.freightCustomDutyPercent,
      prelimsPercent: row.prelimsPercent,
      fohPercent: row.fohPercent,
      commitmentsPercent: row.commitmentsPercent,
      contingenciesPercent: row.contingenciesPercent,
      markup: row.markup,
      masterItems,
    })

    return total + summary.sellingAmount
  }, 0)

  return totalSellingAmount || latestLog?.submittedAmount || 0
}

export function toAmountInput(value: number) {
  return value ? String(value) : ''
}

function compareRevisionNumbers(left: string, right: string) {
  const leftMatch = left.match(/\d+/g)
  const rightMatch = right.match(/\d+/g)
  const leftNumber = leftMatch ? Number(leftMatch.at(-1)) : -1
  const rightNumber = rightMatch ? Number(rightMatch.at(-1)) : -1

  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }

  return left.localeCompare(right)
}
