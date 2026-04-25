'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BoqItem,
  MasterListItem,
  TenderCosting,
  TenderLog,
  calculateCostSummary,
  contractTypeOptions,
  formatMoney,
  getBoqItems,
  getMasterListItems,
  getTenderCostings,
  getTenderLogs,
} from '@/lib/estimation-storage'

type SummaryTotals = {
  totalSellingAmount: number
  directCost: number
  markUp: number
  material: number
  machining: number
  coating: number
  consumables: number
  subcontracts: number
  productionLabour: number
  freightCustoms: number
  installationLabour: number
  prelims: number
  fohPercent: number
  fohValue: number
  commitmentsPercent: number
  commitmentsValue: number
  contingenciesPercent: number
  contingenciesValue: number
  totalCost: number
  netProfitBeforeTax: number
  corporateTax: number
  netProfit: number
  revisionNumber: string
}

const emptyTotals: SummaryTotals = {
  totalSellingAmount: 0,
  directCost: 0,
  markUp: 0,
  material: 0,
  machining: 0,
  coating: 0,
  consumables: 0,
  subcontracts: 0,
  productionLabour: 0,
  freightCustoms: 0,
  installationLabour: 0,
  prelims: 0,
  fohPercent: 0,
  fohValue: 0,
  commitmentsPercent: 0,
  commitmentsValue: 0,
  contingenciesPercent: 0,
  contingenciesValue: 0,
  totalCost: 0,
  netProfitBeforeTax: 0,
  corporateTax: 0,
  netProfit: 0,
  revisionNumber: '',
}

export default function EstimatedSummaryClient() {
  const [tenders, setTenders] = useState<TenderLog[]>([])
  const [boqItems, setBoqItems] = useState<BoqItem[]>([])
  const [costings, setCostings] = useState<TenderCosting[]>([])
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [selectedTenderNumber, setSelectedTenderNumber] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')
  const [selectedRevisionNumber, setSelectedRevisionNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [
          savedTenders,
          savedBoqItems,
          savedCostings,
          savedMasterItems,
        ] = await Promise.all([
          getTenderLogs(),
          getBoqItems(),
          getTenderCostings(),
          getMasterListItems(),
        ])

        setTenders(savedTenders)
        setBoqItems(savedBoqItems)
        setCostings(savedCostings)
        setMasterItems(savedMasterItems)

        if (savedTenders[0]) {
          setSelectedTenderNumber(savedTenders[0].tenderNumber)
          setSelectedProjectName(savedTenders[0].projectName)
          const revisionOptions = getAvailableRevisionNumbers(
            savedTenders[0],
            savedBoqItems
          )
          setSelectedRevisionNumber(revisionOptions.at(-1) || '')
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load estimated summary data.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const selectedTender = useMemo(
    () =>
      tenders.find(
        (tender) =>
          tender.tenderNumber === selectedTenderNumber &&
          tender.projectName === selectedProjectName
      ) ||
      tenders.find((tender) => tender.tenderNumber === selectedTenderNumber) ||
      tenders.find((tender) => tender.projectName === selectedProjectName) ||
      null,
    [selectedProjectName, selectedTenderNumber, tenders]
  )

  const availableRevisionNumbers = useMemo(() => {
    if (!selectedTender) {
      return []
    }

    return getAvailableRevisionNumbers(selectedTender, boqItems)
  }, [boqItems, selectedTender])

  useEffect(() => {
    if (!selectedTender) {
      setSelectedRevisionNumber('')
      return
    }

    if (
      selectedRevisionNumber &&
      availableRevisionNumbers.includes(selectedRevisionNumber)
    ) {
      return
    }

    setSelectedRevisionNumber(availableRevisionNumbers.at(-1) || '')
  }, [availableRevisionNumbers, selectedRevisionNumber, selectedTender])

  const summary = useMemo(() => {
    if (!selectedTender) {
      return {
        totals: emptyTotals,
        message: '',
      }
    }

    return buildEstimatedSummary(
      selectedTender,
      boqItems,
      costings,
      masterItems,
      selectedRevisionNumber
    )
  }, [boqItems, costings, masterItems, selectedRevisionNumber, selectedTender])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Estimated Summary</h1>
        <p className="mt-2 text-slate-700">
          Review the tender-level commercial summary from the saved BOQ and costing data.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Tender #">
            <select
              value={selectedTenderNumber}
              onChange={(event) => handleTenderChange(event.target.value, tenders, setSelectedTenderNumber, setSelectedProjectName)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select tender #</option>
              {tenders.map((tender) => (
                <option key={tender.id} value={tender.tenderNumber}>
                  {tender.tenderNumber}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Project Name">
            <select
              value={selectedProjectName}
              onChange={(event) => handleProjectChange(event.target.value, tenders, setSelectedTenderNumber, setSelectedProjectName)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select project name</option>
              {tenders.map((tender) => (
                <option key={`${tender.id}-project`} value={tender.projectName}>
                  {tender.projectName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Revision #">
            <select
              value={selectedRevisionNumber}
              onChange={(event) => setSelectedRevisionNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select revision #</option>
              {availableRevisionNumbers.map((revisionNumber) => (
                <option key={revisionNumber || 'blank'} value={revisionNumber}>
                  {revisionNumber || 'Current'}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {summary.message ? (
          <p className="mt-4 text-sm text-slate-600">{summary.message}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
            Estimated Summary
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-slate-700">Loading estimated summary...</div>
        ) : !selectedTender ? (
          <div className="p-8 text-slate-700">
            Select a tender and project name to view the summary.
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <SummaryInfoRow label="Tender #" value={selectedTender.tenderNumber} />
                  <SummaryInfoRow label="Project Name" value={selectedTender.projectName} />
                  <SummaryInfoRow
                    label="Revision #"
                    value={summary.totals.revisionNumber || '-'}
                  />
                  <SummaryInfoRow
                    label="Territory"
                    value={selectedTender.projectLocation || '-'}
                  />
                  <SummaryInfoRow label="Currency" value="AED" />
                  <SummaryInfoRow
                    label="Type of Contract"
                    value={selectedTender.typeOfContract || contractTypeOptions[0]}
                  />
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <SummaryInfoRow label="Total Cost" value={formatMoney(summary.totals.directCost)} />
                  <SummaryInfoRow
                    label="Mark Up"
                    value={formatNumber(summary.totals.markUp, 2)}
                  />
                  <SummaryInfoRow
                    label="Total Selling Amount"
                    value={formatMoney(summary.totals.totalSellingAmount)}
                    strong
                  />
                </tbody>
              </table>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
              <table className="min-w-[760px] w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 px-4 py-3 text-left font-semibold text-slate-900">
                      Budget
                    </th>
                    <th className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                      %
                    </th>
                    <th className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <SectionHeading title="Direct Cost" />
                  <BudgetRow
                    label="Material"
                    percent={getComputedPercent(summary.totals.material, summary.totals.totalSellingAmount)}
                    value={summary.totals.material}
                  />
                  <BudgetRow
                    label="Machining"
                    percent={getComputedPercent(summary.totals.machining, summary.totals.totalSellingAmount)}
                    value={summary.totals.machining}
                  />
                  <BudgetRow
                    label="Coating"
                    percent={getComputedPercent(summary.totals.coating, summary.totals.totalSellingAmount)}
                    value={summary.totals.coating}
                  />
                  <BudgetRow
                    label="Consumables"
                    percent={getComputedPercent(summary.totals.consumables, summary.totals.totalSellingAmount)}
                    value={summary.totals.consumables}
                  />
                  <BudgetRow
                    label="Subcontracts"
                    percent={getComputedPercent(summary.totals.subcontracts, summary.totals.totalSellingAmount)}
                    value={summary.totals.subcontracts}
                  />
                  <BudgetRow
                    label="Production Labour"
                    percent={getComputedPercent(summary.totals.productionLabour, summary.totals.totalSellingAmount)}
                    value={summary.totals.productionLabour}
                  />
                  <BudgetRow
                    label="Freight & Customs"
                    percent={getComputedPercent(summary.totals.freightCustoms, summary.totals.totalSellingAmount)}
                    value={summary.totals.freightCustoms}
                  />
                  <BudgetRow
                    label="Installation Labour"
                    percent={getComputedPercent(summary.totals.installationLabour, summary.totals.totalSellingAmount)}
                    value={summary.totals.installationLabour}
                  />
                  <BudgetRow
                    label="Prelims"
                    percent={getComputedPercent(summary.totals.prelims, summary.totals.totalSellingAmount)}
                    value={summary.totals.prelims}
                  />
                  <SubtotalRow value={summary.totals.directCost} />

                  <SectionHeading title="Indirect Cost" />
                  <BudgetRow
                    label="FOH"
                    percent={summary.totals.fohPercent}
                    value={summary.totals.fohValue}
                  />
                  <BudgetRow
                    label="Commitments"
                    percent={summary.totals.commitmentsPercent}
                    value={summary.totals.commitmentsValue}
                  />
                  <BudgetRow
                    label="Contingencies"
                    percent={summary.totals.contingenciesPercent}
                    value={summary.totals.contingenciesValue}
                  />
                  <SubtotalRow
                    value={
                      summary.totals.fohValue +
                      summary.totals.commitmentsValue +
                      summary.totals.contingenciesValue
                    }
                  />

                  <TotalRow
                    label="Total Cost"
                    percent={getComputedPercent(summary.totals.totalCost, summary.totals.totalSellingAmount)}
                    value={summary.totals.totalCost}
                  />
                  <SpacerRow />
                  <TotalRow
                    label="Net Profit Before Tax"
                    percent={getComputedPercent(summary.totals.netProfitBeforeTax, summary.totals.totalSellingAmount)}
                    value={summary.totals.netProfitBeforeTax}
                  />
                  <TotalRow
                    label="Corporate Tax @ 9%"
                    percent={getComputedPercent(summary.totals.corporateTax, summary.totals.totalSellingAmount)}
                    value={summary.totals.corporateTax}
                  />
                  <TotalRow
                    label="Net Profit"
                    percent={getComputedPercent(summary.totals.netProfit, summary.totals.totalSellingAmount)}
                    value={summary.totals.netProfit}
                    accent
                  />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function buildEstimatedSummary(
  tender: TenderLog,
  boqItems: BoqItem[],
  costings: TenderCosting[],
  masterItems: MasterListItem[],
  selectedRevisionNumber: string
) {
  const tenderRows = boqItems.filter((row) => row.tenderNumber === tender.tenderNumber)

  if (tenderRows.length === 0) {
    return {
      totals: emptyTotals,
      message: `No BOQ rows found for tender ${tender.tenderNumber}.`,
    }
  }

  const revisionNumber = getTargetRevisionNumber(
    tender,
    tenderRows,
    selectedRevisionNumber
  )
  const revisionRows = tenderRows.filter(
    (row) => (row.revisionNumber || '') === revisionNumber
  )

  if (revisionRows.length === 0) {
    return {
      totals: { ...emptyTotals, revisionNumber },
      message: `No BOQ rows found for revision ${revisionNumber || 'current revision'}.`,
    }
  }

  const firstRow = revisionRows[0]
  let costedRowCount = 0
  const totals = revisionRows.reduce(
    (accumulator, row) => {
      const costing = costings.find(
        (item) => String(item.boqItemId) === String(row.id)
      )

      if (!costing) {
        return accumulator
      }

      costedRowCount += 1
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

      const quantity = Number(row.quantity || 0)

      accumulator.totalSellingAmount += summary.sellingAmount
      accumulator.material += summary.materialUnitCost * quantity
      accumulator.machining += summary.machiningUnitCost * quantity
      accumulator.coating += summary.coatingUnitCost * quantity
      accumulator.consumables += summary.consumableUnitCost * quantity
      accumulator.subcontracts += summary.subcontractUnitCost * quantity
      accumulator.productionLabour += summary.productionLabourUnitCost * quantity
      accumulator.freightCustoms += summary.freightCustomUnitCost * quantity
      accumulator.installationLabour += summary.installationLabourUnitCost * quantity
      accumulator.prelims += summary.prelimsUnitCost * quantity
      accumulator.directCost += summary.totalCost

      return accumulator
    },
    {
      ...emptyTotals,
      markUp: Number(firstRow.markup || 0),
      revisionNumber,
    }
  )

  totals.fohPercent = Number(firstRow.fohPercent || 0)
  totals.commitmentsPercent = Number(firstRow.commitmentsPercent || 0)
  totals.contingenciesPercent = Number(firstRow.contingenciesPercent || 0)

  totals.fohValue = totals.totalSellingAmount * (totals.fohPercent / 100)
  totals.commitmentsValue =
    totals.totalSellingAmount * (totals.commitmentsPercent / 100)
  totals.contingenciesValue =
    totals.totalSellingAmount * (totals.contingenciesPercent / 100)

  totals.totalCost =
    totals.directCost +
    totals.fohValue +
    totals.commitmentsValue +
    totals.contingenciesValue
  totals.netProfitBeforeTax = totals.totalSellingAmount - totals.totalCost
  totals.corporateTax =
    totals.netProfitBeforeTax > 0 ? totals.netProfitBeforeTax * 0.09 : 0
  totals.netProfit = totals.netProfitBeforeTax - totals.corporateTax

  return {
    totals,
    message:
      costedRowCount === 0
        ? `No costing details are saved yet for ${revisionNumber || 'the selected revision'}.`
        : revisionNumber
          ? `Showing revision ${revisionNumber}.`
          : 'Showing current BOQ values.',
  }
}

function getTargetRevisionNumber(
  tender: TenderLog,
  rows: BoqItem[],
  selectedRevisionNumber: string
) {
  const manualRevision = String(selectedRevisionNumber || '').trim()

  if (
    manualRevision &&
    rows.some((row) => String(row.revisionNumber || '').trim() === manualRevision)
  ) {
    return manualRevision
  }

  const tenderRevision = String(tender.revisionNumber || '').trim()

  if (
    tenderRevision &&
    rows.some((row) => String(row.revisionNumber || '').trim() === tenderRevision)
  ) {
    return tenderRevision
  }

  return [...new Set(rows.map((row) => String(row.revisionNumber || '').trim()))]
    .sort(compareRevisionNumbers)
    .at(-1) || ''
}

function getAvailableRevisionNumbers(tender: TenderLog, boqItems: BoqItem[]) {
  return [...new Set(
    boqItems
      .filter((row) => row.tenderNumber === tender.tenderNumber)
      .map((row) => String(row.revisionNumber || '').trim())
  )].sort(compareRevisionNumbers)
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

function handleTenderChange(
  value: string,
  tenders: TenderLog[],
  setSelectedTenderNumber: (value: string) => void,
  setSelectedProjectName: (value: string) => void
) {
  const tender = tenders.find((item) => item.tenderNumber === value)
  setSelectedTenderNumber(value)
  setSelectedProjectName(tender?.projectName || '')
}

function handleProjectChange(
  value: string,
  tenders: TenderLog[],
  setSelectedTenderNumber: (value: string) => void,
  setSelectedProjectName: (value: string) => void
) {
  const tender = tenders.find((item) => item.projectName === value)
  setSelectedProjectName(value)
  setSelectedTenderNumber(tender?.tenderNumber || '')
}

function getComputedPercent(value: number, totalSellingAmount: number) {
  if (!totalSellingAmount) return 0
  return (value / totalSellingAmount) * 100
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
      <label className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  )
}

function SummaryInfoRow({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-3 font-semibold text-slate-900">
        {label}
      </td>
      <td
        className={`border border-slate-300 px-4 py-3 text-right text-slate-900 ${
          strong ? 'font-bold' : ''
        }`}
      >
        {value}
      </td>
    </tr>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <tr className="bg-slate-100">
      <td className="border border-slate-300 px-4 py-3 font-bold uppercase text-slate-900">
        {title}
      </td>
      <td className="border border-slate-300 px-4 py-3" />
      <td className="border border-slate-300 px-4 py-3" />
    </tr>
  )
}

function BudgetRow({
  label,
  percent,
  value,
}: {
  label: string
  percent: number
  value: number
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">{label}</td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatNumber(percent, 2)}%
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(value)}
      </td>
    </tr>
  )
}

function SubtotalRow({ value }: { value: number }) {
  return (
    <tr className="bg-slate-50">
      <td className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-900">
        Subtotal
      </td>
      <td className="border border-slate-300 px-4 py-2.5" />
      <td className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-900">
        {formatMoney(value)}
      </td>
    </tr>
  )
}

function TotalRow({
  label,
  percent,
  value,
  accent = false,
}: {
  label: string
  percent: number
  value: number
  accent?: boolean
}) {
  return (
    <tr className={accent ? 'bg-slate-900 text-white' : 'bg-white'}>
      <td
        className={`border border-slate-300 px-4 py-3 font-semibold ${
          accent ? 'text-white' : 'text-slate-900'
        }`}
      >
        {label}
      </td>
      <td
        className={`border border-slate-300 px-4 py-3 text-right font-semibold ${
          accent ? 'text-white' : 'text-slate-900'
        }`}
      >
        {formatNumber(percent, 2)}%
      </td>
      <td
        className={`border border-slate-300 px-4 py-3 text-right font-semibold ${
          accent ? 'text-white' : 'text-slate-900'
        }`}
      >
        {formatMoney(value)}
      </td>
    </tr>
  )
}

function SpacerRow() {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2" colSpan={3} />
    </tr>
  )
}

function formatNumber(value: number, digits: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
