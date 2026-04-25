'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  formatMoney,
  getContractRevenues,
  getTenderLogs,
  type ContractRevenue,
  type TenderLog,
} from '@/lib/estimation-storage'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
type ProjectLifecycleStatus = 'open' | 'closed'

type PeriodSelection = {
  quarter: Quarter
  year: string
}

type PeriodMeta = {
  key: string
  label: string
  kind: 'quarter' | 'year'
  year: number
  quarter?: Quarter
}

type PcrCategoryKey =
  | 'materials'
  | 'labour'
  | 'machining'
  | 'coating'
  | 'consumables'
  | 'subcontracts'
  | 'freightCustoms'
  | 'prelims'
  | 'foh'
  | 'commitments'
  | 'contingencies'

type PcrReportRow = {
  key: PcrCategoryKey
  actualIncurredCost: number
}

type PcrReport = {
  rows: PcrReportRow[]
  totals: {
    originalBudget: number
    variationBudget: number
    revisedBudget: number
    actualIncurredCost: number
    totalExpectedCostAtCompletion: number
  }
  originalContract: number
  agreedVariations: number
  revisedContractValue: number
}

type PcrSnapshotRecord = {
  id: number
  project_number: string
  project_name: string
  quarter: Quarter
  year: number
  status: 'submitted' | 'approved'
  report_data?: {
    selection?: {
      projectNumber: string
      projectName: string
    }
    periodSelection?: {
      quarter: Quarter
      year: string
    }
    projectStatus?: ProjectLifecycleStatus
    report?: PcrReport
  }
}

type BurRow = {
  key: string
  projectNumber: string
  projectName: string
  location: string
  status: ProjectLifecycleStatus
  originalContract: number
  variationContract: number
  revisedContract: number
  originalBudget: number
  variationBudget: number
  revisedBudget: number
  incurred: number
  expectedAtCompletion: number
  cumulativeForecastCompletion: Record<string, number>
  quarterlyForecastCompletion: Record<string, number>
  forecastCost: Record<string, number>
  actualCost: Record<string, number>
  forecastRevenue: Record<string, number>
  actualRevenue: Record<string, number>
  forecastGrossProfit: Record<string, number>
  actualGrossProfit: Record<string, number>
  actualGrossProfitAsOfPreviousYear: number
  grossProfitAsOfCurrentQuarter: number
  atCompletion: number
}

type BurSummary = {
  originalContract: number
  variationContract: number
  revisedContract: number
  originalBudget: number
  variationBudget: number
  revisedBudget: number
  incurred: number
  expectedAtCompletion: number
  forecastCost: Record<string, number>
  actualCost: Record<string, number>
  forecastRevenue: Record<string, number>
  actualRevenue: Record<string, number>
  forecastGrossProfit: Record<string, number>
  actualGrossProfit: Record<string, number>
  forecastOh: Record<string, number>
  actualOh: Record<string, number>
  forecastOhPercent: Record<string, number>
  actualOhPercent: Record<string, number>
  forecastNetProfit: Record<string, number>
  actualNetProfit: Record<string, number>
  grossProfitAsOfCurrentQuarter: number
  atCompletion: number
}

type BurReport = {
  periods: PeriodMeta[]
  rows: BurRow[]
  summary: BurSummary
  asOfLabel: string
  previousYearLabel: string
  message: string
}

type BurReportSnapshotData = {
  periodSelection: PeriodSelection
  report: BurReport
  cumulativeInputs: Record<string, string>
  ohInputs: Record<string, string>
}

type BurSnapshotRecord = {
  id: number
  quarter: Quarter
  year: number
  status: 'submitted' | 'approved' | 'rejected'
  report_data: BurReportSnapshotData
  submitted_by: string
  reviewed_by: string
  submitted_at: string
  reviewed_at: string | null
}

type MeResponse = {
  role: string
}

const quarterOrder: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']
const stickyProjectNumberWidth = 130
const stickyProjectNameWidth = 220

export default function BurClient() {
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear + index)
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>({
    quarter: 'Q1',
    year: String(currentYear),
  })
  const [pcrSnapshots, setPcrSnapshots] = useState<PcrSnapshotRecord[]>([])
  const [burSnapshots, setBurSnapshots] = useState<BurSnapshotRecord[]>([])
  const [tenderLogs, setTenderLogs] = useState<TenderLog[]>([])
  const [revenues, setRevenues] = useState<ContractRevenue[]>([])
  const [cumulativeInputs, setCumulativeInputs] = useState<Record<string, string>>({})
  const [ohInputs, setOhInputs] = useState<Record<string, string>>({})
  const [reviewSnapshotId, setReviewSnapshotId] = useState<number | null>(null)
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [pcrData, burData, tenderData, revenueData, me] = await Promise.all([
          fetchAPI('/procurement/pcr/'),
          fetchAPI('/procurement/bur/'),
          getTenderLogs(),
          getContractRevenues(),
          fetchAPI('/accounts/me/'),
        ])

        setPcrSnapshots(Array.isArray(pcrData) ? (pcrData as PcrSnapshotRecord[]) : [])
        setBurSnapshots(Array.isArray(burData) ? (burData as BurSnapshotRecord[]) : [])
        setTenderLogs(tenderData)
        setRevenues(revenueData)
        setRole((me as MeResponse)?.role || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load BUR data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const matchingSnapshot = useMemo(
    () =>
      burSnapshots.find(
        (snapshot) =>
          snapshot.quarter === periodSelection.quarter &&
          String(snapshot.year) === periodSelection.year
      ) || null,
    [burSnapshots, periodSelection]
  )

  useEffect(() => {
    const nextInputs = matchingSnapshot?.report_data?.cumulativeInputs
    setCumulativeInputs(nextInputs && typeof nextInputs === 'object' ? nextInputs : {})
    const nextOhInputs = matchingSnapshot?.report_data?.ohInputs
    setOhInputs(nextOhInputs && typeof nextOhInputs === 'object' ? nextOhInputs : {})
  }, [matchingSnapshot])

  const reviewSnapshot = useMemo(
    () => burSnapshots.find((snapshot) => snapshot.id === reviewSnapshotId) || null,
    [burSnapshots, reviewSnapshotId]
  )

  const liveReport = useMemo(
    () =>
      buildBurReport(
        periodSelection,
        pcrSnapshots,
        tenderLogs,
        revenues,
        cumulativeInputs,
        ohInputs
      ),
    [cumulativeInputs, ohInputs, periodSelection, pcrSnapshots, revenues, tenderLogs]
  )

  async function handleSubmit() {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const savedSnapshot = (await fetchAPI('/procurement/bur/', {
        method: 'POST',
        body: JSON.stringify({
          quarter: periodSelection.quarter,
          year: Number(periodSelection.year),
          report_data: {
            periodSelection,
            report: liveReport,
            cumulativeInputs,
            ohInputs,
          },
        }),
      })) as BurSnapshotRecord

      setBurSnapshots((prev) => upsertBurSnapshot(prev, savedSnapshot))
      setReviewSnapshotId(savedSnapshot.id)
      setMessage('BUR submitted for approval.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit BUR.')
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove(snapshotId: number) {
    setReviewingId(snapshotId)
    setError('')
    setMessage('')

    try {
      const approvedSnapshot = (await fetchAPI(`/procurement/bur/${snapshotId}/approve/`, {
        method: 'POST',
      })) as BurSnapshotRecord

      setBurSnapshots((prev) => upsertBurSnapshot(prev, approvedSnapshot))
      setMessage('BUR approved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve BUR.')
    } finally {
      setReviewingId(null)
    }
  }

  async function handleReject(snapshotId: number) {
    setReviewingId(snapshotId)
    setError('')
    setMessage('')

    try {
      const rejectedSnapshot = (await fetchAPI(`/procurement/bur/${snapshotId}/reject/`, {
        method: 'POST',
      })) as BurSnapshotRecord

      setBurSnapshots((prev) => upsertBurSnapshot(prev, rejectedSnapshot))
      setMessage('BUR rejected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject BUR.')
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">BUR REPORT</h1>
        <p className="mt-2 text-slate-700">
          Review budget updates against approved PCR data for the selected quarter.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Quarter">
            <select
              value={periodSelection.quarter}
              onChange={(event) =>
                setPeriodSelection((prev) => ({
                  ...prev,
                  quarter: event.target.value as Quarter,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {quarterOrder.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year">
            <select
              value={periodSelection.year}
              onChange={(event) =>
                setPeriodSelection((prev) => ({
                  ...prev,
                  year: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Actions">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || loading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? 'Submitting...' : 'Submit'}
              </button>
              {role === 'admin' && matchingSnapshot ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(matchingSnapshot.id)}
                    disabled={reviewingId === matchingSnapshot.id}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {reviewingId === matchingSnapshot.id &&
                    matchingSnapshot.status !== 'rejected'
                      ? 'Working...'
                      : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(matchingSnapshot.id)}
                    disabled={reviewingId === matchingSnapshot.id}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    {reviewingId === matchingSnapshot.id &&
                    matchingSnapshot.status !== 'approved'
                      ? 'Working...'
                      : 'Reject'}
                  </button>
                </>
              ) : null}
            </div>
            {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          </Field>
        </div>
      </div>

      <BurReportSection
        title="Current Report"
        report={liveReport}
        periodSelection={periodSelection}
        cumulativeInputs={cumulativeInputs}
        onCumulativeChange={(rowKey, periodKey, value) =>
          setCumulativeInputs((prev) => ({
            ...prev,
            [getCumulativeInputKey(periodSelection, rowKey, periodKey)]: value,
          }))
        }
        ohInputs={ohInputs}
        onOhChange={(periodKey, value) =>
          setOhInputs((prev) => ({
            ...prev,
            [getOhInputKey(periodSelection, periodKey)]: value,
          }))
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Saved BUR Entries</h2>
          <p className="mt-2 text-sm text-slate-600">
            Submitted quarterly BUR snapshots are listed here for review and approval.
          </p>
        </div>

        <div className="max-h-[40vh] overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Quarter</HeaderCell>
                <HeaderCell>Year</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Submitted By</HeaderCell>
                <HeaderCell>Submitted At</HeaderCell>
                <HeaderCell>Reviewed By</HeaderCell>
                <HeaderCell>Reviewed At</HeaderCell>
                <HeaderCell>Review</HeaderCell>
                <HeaderCell>Approval</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {burSnapshots.length > 0 ? (
                burSnapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="bg-white">
                    <BodyCell>{snapshot.quarter}</BodyCell>
                    <BodyCell>{snapshot.year}</BodyCell>
                    <BodyCell className="capitalize">{snapshot.status}</BodyCell>
                    <BodyCell>{snapshot.submitted_by || '-'}</BodyCell>
                    <BodyCell>{formatDateTime(snapshot.submitted_at)}</BodyCell>
                    <BodyCell>{snapshot.reviewed_by || '-'}</BodyCell>
                    <BodyCell>{formatDateTime(snapshot.reviewed_at)}</BodyCell>
                    <BodyCell>
                      <button
                        type="button"
                        onClick={() => setReviewSnapshotId(snapshot.id)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        Review
                      </button>
                    </BodyCell>
                    <BodyCell>
                      {role === 'admin' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(snapshot.id)}
                            disabled={reviewingId === snapshot.id}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(snapshot.id)}
                            disabled={reviewingId === snapshot.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={9}>
                    {loading ? 'Loading saved BUR entries...' : 'No BUR entries have been saved yet.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewSnapshot?.report_data?.report ? (
        <BurReportSection
          title="Saved Snapshot Review"
          report={reviewSnapshot.report_data.report}
          periodSelection={reviewSnapshot.report_data.periodSelection || {
            quarter: reviewSnapshot.quarter,
            year: String(reviewSnapshot.year),
          }}
          ohInputs={reviewSnapshot.report_data.ohInputs || {}}
          snapshotStatus={reviewSnapshot.status}
          snapshotMeta={{
            submittedBy: reviewSnapshot.submitted_by,
            submittedAt: reviewSnapshot.submitted_at,
            reviewedBy: reviewSnapshot.reviewed_by,
            reviewedAt: reviewSnapshot.reviewed_at,
          }}
        />
      ) : null}
    </div>
  )
}

function BurReportSection({
  title,
  report,
  periodSelection,
  cumulativeInputs = {},
  ohInputs = {},
  onCumulativeChange,
  onOhChange,
  snapshotStatus,
  snapshotMeta,
}: {
  title: string
  report: BurReport
  periodSelection: PeriodSelection
  cumulativeInputs?: Record<string, string>
  ohInputs?: Record<string, string>
  onCumulativeChange?: (rowKey: string, periodKey: string, value: string) => void
  onOhChange?: (periodKey: string, value: string) => void
  snapshotStatus?: string
  snapshotMeta?: {
    submittedBy: string
    submittedAt: string | null
    reviewedBy: string
    reviewedAt: string | null
  }
}) {
  const blankCellsBeforeForecastGrossProfit = 12 + report.periods.length * 6
  const totalColumnCount = 17 + report.periods.length * 8

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
            {title}
          </h2>
          {snapshotStatus ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {snapshotStatus}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-600">BUR REPORT AS OF : {report.asOfLabel}</p>
        {snapshotMeta ? (
          <p className="mt-2 text-sm text-slate-600">
            Submitted by {snapshotMeta.submittedBy || '-'} on{' '}
            {formatDateTime(snapshotMeta.submittedAt)}. Reviewed by{' '}
            {snapshotMeta.reviewedBy || '-'} on {formatDateTime(snapshotMeta.reviewedAt)}.
          </p>
        ) : null}
      </div>

      <div className="space-y-6 p-6">
        {report.message ? <p className="text-sm text-slate-600">{report.message}</p> : null}

        <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-300">
          <table className="min-w-[2600px] border-collapse text-sm">
            <thead className="sticky top-0 z-30 bg-slate-100 text-slate-900">
              <tr>
                <StickyHeaderCell left={0} width={stickyProjectNumberWidth} rowSpan={2}>
                  Project #
                </StickyHeaderCell>
                <StickyHeaderCell
                  left={stickyProjectNumberWidth}
                  width={stickyProjectNameWidth}
                  rowSpan={2}
                >
                  Project Name
                </StickyHeaderCell>
                <HeaderCell rowSpan={2}>Location</HeaderCell>
                <HeaderCell rowSpan={2}>Status</HeaderCell>
                <HeaderCell colSpan={3}>Contract</HeaderCell>
                <HeaderCell colSpan={3}>Budget</HeaderCell>
                <HeaderCell colSpan={2}>Actual Cost</HeaderCell>
                <HeaderCell colSpan={report.periods.length}>Cumulative Forecast Completion %</HeaderCell>
                <HeaderCell colSpan={report.periods.length}>Quarterly Forecast Completion %</HeaderCell>
                <HeaderCell colSpan={report.periods.length}>Forecast Cost</HeaderCell>
                <HeaderCell colSpan={report.periods.length + 1}>Actual Cost</HeaderCell>
                <HeaderCell colSpan={report.periods.length}>Forecast Revenue</HeaderCell>
                <HeaderCell colSpan={report.periods.length + 1}>Actual Revenue</HeaderCell>
                <HeaderCell colSpan={report.periods.length}>Forecast Gross Profit</HeaderCell>
                <HeaderCell colSpan={report.periods.length + 1}>Actual Gross Profit</HeaderCell>
                <HeaderCell colSpan={2}>Gross Profit</HeaderCell>
              </tr>
              <tr>
                <HeaderCell>Original</HeaderCell>
                <HeaderCell>Variation</HeaderCell>
                <HeaderCell>Revised</HeaderCell>
                <HeaderCell>Original</HeaderCell>
                <HeaderCell>Variation</HeaderCell>
                <HeaderCell>Revised</HeaderCell>
                <HeaderCell>Incurred</HeaderCell>
                <HeaderCell>Expected At Completion</HeaderCell>
                {report.periods.map((period) => (
                  <HeaderCell key={`cum-${period.key}`}>{period.label}</HeaderCell>
                ))}
                {report.periods.map((period) => (
                  <HeaderCell key={`qfc-${period.key}`}>{period.label}</HeaderCell>
                ))}
                {report.periods.map((period) => (
                  <HeaderCell key={`fc-${period.key}`}>{period.label}</HeaderCell>
                ))}
                <HeaderCell>{report.previousYearLabel}</HeaderCell>
                {report.periods.map((period) => (
                  <HeaderCell key={`ac-${period.key}`}>{period.label}</HeaderCell>
                ))}
                {report.periods.map((period) => (
                  <HeaderCell key={`fr-${period.key}`}>{period.label}</HeaderCell>
                ))}
                <HeaderCell>{report.previousYearLabel}</HeaderCell>
                {report.periods.map((period) => (
                  <HeaderCell key={`ar-${period.key}`}>{period.label}</HeaderCell>
                ))}
                {report.periods.map((period) => (
                  <HeaderCell key={`fgp-${period.key}`}>{period.label}</HeaderCell>
                ))}
                <HeaderCell>{report.previousYearLabel}</HeaderCell>
                {report.periods.map((period) => (
                  <HeaderCell key={`agp-${period.key}`}>{period.label}</HeaderCell>
                ))}
                <HeaderCell>As Of Current Quarter</HeaderCell>
                <HeaderCell>At Completion</HeaderCell>
              </tr>
            </thead>

            <tbody>
              {report.rows.length > 0 ? (
                report.rows.map((row) => (
                  <tr key={row.key} className="bg-white">
                    <StickyBodyCell left={0} width={stickyProjectNumberWidth}>
                      {row.projectNumber}
                    </StickyBodyCell>
                    <StickyBodyCell
                      left={stickyProjectNumberWidth}
                      width={stickyProjectNameWidth}
                    >
                      {row.projectName}
                    </StickyBodyCell>
                    <BodyCell>{row.location || '-'}</BodyCell>
                    <BodyCell className="capitalize">{row.status}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.originalContract)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.variationContract)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.revisedContract)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.originalBudget)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.variationBudget)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.revisedBudget)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.incurred)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.expectedAtCompletion)}</BodyCell>
                    {report.periods.map((period) => {
                      const inputKey = getCumulativeInputKey(periodSelection, row.key, period.key)
                      const value =
                        cumulativeInputs[inputKey] ??
                        (row.cumulativeForecastCompletion[period.key]
                          ? row.cumulativeForecastCompletion[period.key].toFixed(2)
                          : '')

                      return (
                        <BodyCell key={`cum-input-${row.key}-${period.key}`}>
                          {onCumulativeChange ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={value}
                              onChange={(event) =>
                                onCumulativeChange(row.key, period.key, event.target.value)
                              }
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-slate-900"
                            />
                          ) : (
                            <div className="text-right">
                              {formatPercent(row.cumulativeForecastCompletion[period.key])}
                            </div>
                          )}
                        </BodyCell>
                      )
                    })}
                    {report.periods.map((period) => (
                      <BodyCell key={`qfc-value-${row.key}-${period.key}`} align="right">
                        {formatPercent(row.quarterlyForecastCompletion[period.key])}
                      </BodyCell>
                    ))}
                    {report.periods.map((period) => (
                      <BodyCell key={`fc-value-${row.key}-${period.key}`} align="right">
                        {formatMoney(row.forecastCost[period.key])}
                      </BodyCell>
                    ))}
                    <BodyCell align="right">
                      {formatMoney(row.actualCost[report.previousYearLabel])}
                    </BodyCell>
                    {report.periods.map((period) => (
                      <BodyCell key={`ac-value-${row.key}-${period.key}`} align="right">
                        {formatMoney(row.actualCost[period.key])}
                      </BodyCell>
                    ))}
                    {report.periods.map((period) => (
                      <BodyCell key={`fr-value-${row.key}-${period.key}`} align="right">
                        {formatMoney(row.forecastRevenue[period.key])}
                      </BodyCell>
                    ))}
                    <BodyCell align="right">
                      {formatMoney(row.actualRevenue[report.previousYearLabel])}
                    </BodyCell>
                    {report.periods.map((period) => (
                      <BodyCell key={`ar-value-${row.key}-${period.key}`} align="right">
                        {formatMoney(row.actualRevenue[period.key])}
                      </BodyCell>
                    ))}
                    {report.periods.map((period) => (
                      <BodyCell key={`fgp-value-${row.key}-${period.key}`} align="right">
                        {formatMoney(row.forecastGrossProfit[period.key])}
                      </BodyCell>
                    ))}
                    <BodyCell align="right">
                      {formatMoney(row.actualGrossProfitAsOfPreviousYear)}
                    </BodyCell>
                    {report.periods.map((period) => (
                      <BodyCell key={`agp-value-${row.key}-${period.key}`} align="right">
                        {formatMoney(row.actualGrossProfit[period.key])}
                      </BodyCell>
                    ))}
                    <BodyCell align="right">
                      {formatMoney(row.grossProfitAsOfCurrentQuarter)}
                    </BodyCell>
                    <BodyCell align="right">{formatMoney(row.atCompletion)}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={totalColumnCount}>
                    No open PCR entries were found for this quarter and year yet.
                  </BodyCell>
                </tr>
              )}
            </tbody>

            <tfoot className="sticky bottom-0 z-20 bg-white text-slate-900">
              <tr>
                <StickyFooterCell left={0} width={stickyProjectNumberWidth}>
                  Total
                </StickyFooterCell>
                <StickyFooterCell left={stickyProjectNumberWidth} width={stickyProjectNameWidth}>
                  -
                </StickyFooterCell>
                <FooterCell>-</FooterCell>
                <FooterCell>-</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.originalContract)}</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.variationContract)}</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.revisedContract)}</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.originalBudget)}</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.variationBudget)}</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.revisedBudget)}</FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.incurred)}</FooterCell>
                <FooterCell align="right">
                  {formatMoney(report.summary.expectedAtCompletion)}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`total-cum-${period.key}`} align="right">
                    -
                  </FooterCell>
                ))}
                {report.periods.map((period) => (
                  <FooterCell key={`total-qfc-${period.key}`} align="right">
                    -
                  </FooterCell>
                ))}
                {report.periods.map((period) => (
                  <FooterCell key={`total-fc-${period.key}`} align="right">
                    {formatMoney(report.summary.forecastCost[period.key])}
                  </FooterCell>
                ))}
                <FooterCell align="right">
                  {formatMoney(report.summary.actualCost[report.previousYearLabel])}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`total-ac-${period.key}`} align="right">
                    {formatMoney(report.summary.actualCost[period.key])}
                  </FooterCell>
                ))}
                {report.periods.map((period) => (
                  <FooterCell key={`total-fr-${period.key}`} align="right">
                    {formatMoney(report.summary.forecastRevenue[period.key])}
                  </FooterCell>
                ))}
                <FooterCell align="right">
                  {formatMoney(report.summary.actualRevenue[report.previousYearLabel])}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`total-ar-${period.key}`} align="right">
                    {formatMoney(report.summary.actualRevenue[period.key])}
                  </FooterCell>
                ))}
                {report.periods.map((period) => (
                  <FooterCell key={`total-fgp-${period.key}`} align="right">
                    {formatMoney(report.summary.forecastGrossProfit[period.key])}
                  </FooterCell>
                ))}
                <FooterCell align="right">
                  {formatMoney(report.summary.actualGrossProfit[report.previousYearLabel])}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`total-agp-${period.key}`} align="right">
                    {formatMoney(report.summary.actualGrossProfit[period.key])}
                  </FooterCell>
                ))}
                <FooterCell align="right">
                  {formatMoney(report.summary.grossProfitAsOfCurrentQuarter)}
                </FooterCell>
                <FooterCell align="right">{formatMoney(report.summary.atCompletion)}</FooterCell>
              </tr>
              <tr>
                <StickyFooterCell left={0} width={stickyProjectNumberWidth}>
                  OH
                </StickyFooterCell>
                <StickyFooterCell left={stickyProjectNumberWidth} width={stickyProjectNameWidth}>
                  -
                </StickyFooterCell>
                <FooterCell colSpan={blankCellsBeforeForecastGrossProfit}>-</FooterCell>
                {report.periods.map((period) => {
                  const inputKey = getOhInputKey(periodSelection, period.key)
                  const value =
                    ohInputs[inputKey] ??
                    (report.summary.forecastOh[period.key]
                      ? report.summary.forecastOh[period.key].toFixed(2)
                      : '')

                  return (
                    <FooterCell key={`forecast-oh-${period.key}`} align="right">
                      {onOhChange ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={value}
                          onChange={(event) => onOhChange(period.key, event.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-slate-900"
                        />
                      ) : (
                        formatMoney(report.summary.forecastOh[period.key])
                      )}
                    </FooterCell>
                  )
                })}
                <FooterCell align="right">
                  {formatMoney(report.summary.actualOh[report.previousYearLabel])}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`actual-oh-${period.key}`} align="right">
                    {formatMoney(report.summary.actualOh[period.key])}
                  </FooterCell>
                ))}
                <FooterCell colSpan={2}>-</FooterCell>
              </tr>
              <tr>
                <StickyFooterCell left={0} width={stickyProjectNumberWidth}>
                  OH %
                </StickyFooterCell>
                <StickyFooterCell left={stickyProjectNumberWidth} width={stickyProjectNameWidth}>
                  -
                </StickyFooterCell>
                <FooterCell colSpan={blankCellsBeforeForecastGrossProfit}>-</FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`forecast-oh-percent-${period.key}`} align="right">
                    {formatPercent(report.summary.forecastOhPercent[period.key])}
                  </FooterCell>
                ))}
                <FooterCell align="right">
                  {formatPercent(report.summary.actualOhPercent[report.previousYearLabel])}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`actual-oh-percent-${period.key}`} align="right">
                    {formatPercent(report.summary.actualOhPercent[period.key])}
                  </FooterCell>
                ))}
                <FooterCell colSpan={2}>-</FooterCell>
              </tr>
              <tr>
                <StickyFooterCell left={0} width={stickyProjectNumberWidth}>
                  Net Profit
                </StickyFooterCell>
                <StickyFooterCell left={stickyProjectNumberWidth} width={stickyProjectNameWidth}>
                  -
                </StickyFooterCell>
                <FooterCell colSpan={blankCellsBeforeForecastGrossProfit}>-</FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`forecast-net-profit-${period.key}`} align="right">
                    {formatMoney(report.summary.forecastNetProfit[period.key])}
                  </FooterCell>
                ))}
                <FooterCell align="right">
                  {formatMoney(report.summary.actualNetProfit[report.previousYearLabel])}
                </FooterCell>
                {report.periods.map((period) => (
                  <FooterCell key={`actual-net-profit-${period.key}`} align="right">
                    {formatMoney(report.summary.actualNetProfit[period.key])}
                  </FooterCell>
                ))}
                <FooterCell colSpan={2}>-</FooterCell>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

function buildBurReport(
  periodSelection: PeriodSelection,
  pcrSnapshots: PcrSnapshotRecord[],
  tenderLogs: TenderLog[],
  revenues: ContractRevenue[],
  cumulativeInputs: Record<string, string>,
  ohInputs: Record<string, string>
): BurReport {
  const selectedYear = Number(periodSelection.year)
  const previousYearLabel = `As Of: Y-${String(selectedYear - 1).slice(-2)}`
  const selectedSnapshots = pcrSnapshots
    .filter(
      (snapshot) =>
        snapshot.quarter === periodSelection.quarter &&
        snapshot.year === selectedYear &&
        getSnapshotReport(snapshot)
    )
    .filter((snapshot) => normalizeProjectStatus(snapshot.report_data?.projectStatus) === 'open')
    .sort((left, right) => {
      const projectNumberCompare = left.project_number.localeCompare(right.project_number)

      if (projectNumberCompare !== 0) {
        return projectNumberCompare
      }

      return left.project_name.localeCompare(right.project_name)
    })

  const maxCompletionYear = Math.max(
    selectedYear,
    ...selectedSnapshots.map(
      (snapshot) =>
        getRevenueCompletionYear(
          revenues,
          snapshot.project_number,
          snapshot.project_name
        ) || selectedYear
    )
  )

  const periods = buildPeriods(selectedYear, maxCompletionYear)
  const snapshotMap = buildSnapshotMap(pcrSnapshots)
  const tenderLocationMap = buildTenderLocationMap(tenderLogs)
  const selectedQuarterIndex = quarterOrder.indexOf(periodSelection.quarter)
  const rows: BurRow[] = selectedSnapshots.map((snapshot) => {
    const report = getSnapshotReport(snapshot)
    const projectKey = getProjectKey(snapshot.project_number, snapshot.project_name)
    const location = tenderLocationMap.get(snapshot.project_name) || '-'
    const originalContract = report?.originalContract || 0
    const variationContract = report?.agreedVariations || 0
    const revisedContract = report?.revisedContractValue || 0
    const originalBudget = report?.totals.originalBudget || 0
    const variationBudget = report?.totals.variationBudget || 0
    const revisedBudget = report?.totals.revisedBudget || 0
    const incurred = report?.totals.actualIncurredCost || 0
    const expectedAtCompletion = report?.totals.totalExpectedCostAtCompletion || 0
    const cumulativeForecastCompletion: Record<string, number> = {}
    const quarterlyForecastCompletion: Record<string, number> = {}
    const forecastCost: Record<string, number> = {}
    const actualCost: Record<string, number> = {}
    const forecastRevenue: Record<string, number> = {}
    const actualRevenue: Record<string, number> = {}
    const forecastGrossProfit: Record<string, number> = {}
    const actualGrossProfit: Record<string, number> = {}

    const previousYearSnapshot = getSnapshotForQuarter(
      snapshotMap,
      snapshot.project_number,
      snapshot.project_name,
      'Q4',
      selectedYear - 1
    )
    const previousYearActualCost = getSnapshotTotalActual(previousYearSnapshot)
    const previousYearActualRevenue =
      getSnapshotRevisedContract(previousYearSnapshot) *
      safeRatio(previousYearActualCost, getSnapshotExpectedAtCompletion(previousYearSnapshot))
    const previousYearActualGrossProfit = previousYearActualRevenue - previousYearActualCost

    actualCost[previousYearLabel] = previousYearActualCost
    actualRevenue[previousYearLabel] = previousYearActualRevenue
    actualGrossProfit[previousYearLabel] = previousYearActualGrossProfit

    let previousCumulativePercent = 0

    periods.forEach((period) => {
      const inputKey = getCumulativeInputKey(periodSelection, projectKey, period.key)
      const rawInput = cumulativeInputs[inputKey]
      const cumulativeValue = normalizePercentage(rawInput)

      cumulativeForecastCompletion[period.key] = cumulativeValue
      quarterlyForecastCompletion[period.key] = Math.max(
        cumulativeValue - previousCumulativePercent,
        0
      )
      previousCumulativePercent = cumulativeValue

      forecastCost[period.key] =
        (quarterlyForecastCompletion[period.key] / 100) * expectedAtCompletion
      forecastRevenue[period.key] =
        (quarterlyForecastCompletion[period.key] / 100) * revisedContract
      forecastGrossProfit[period.key] =
        forecastRevenue[period.key] - forecastCost[period.key]

      const currentSnapshot = getSnapshotForPeriod(
        snapshotMap,
        snapshot.project_number,
        snapshot.project_name,
        period
      )
      const previousSnapshot = getPreviousSnapshotForPeriod(
        snapshotMap,
        snapshot.project_number,
        snapshot.project_name,
        period
      )
      const periodActualCost = Math.max(
        getSnapshotTotalActual(currentSnapshot) - getSnapshotTotalActual(previousSnapshot),
        0
      )

      actualCost[period.key] = periodActualCost
      actualRevenue[period.key] =
        getSnapshotRevisedContract(currentSnapshot) *
        safeRatio(periodActualCost, getSnapshotExpectedAtCompletion(currentSnapshot))
      actualGrossProfit[period.key] =
        actualRevenue[period.key] - actualCost[period.key]
    })

    const grossProfitAsOfCurrentQuarter =
      previousYearActualGrossProfit +
      periods
        .filter((period) => isPeriodWithinSelectedQuarter(period, selectedQuarterIndex))
        .reduce((total, period) => total + (actualGrossProfit[period.key] || 0), 0)

    return {
      key: projectKey,
      projectNumber: snapshot.project_number,
      projectName: snapshot.project_name,
      location,
      status: normalizeProjectStatus(snapshot.report_data?.projectStatus),
      originalContract,
      variationContract,
      revisedContract,
      originalBudget,
      variationBudget,
      revisedBudget,
      incurred,
      expectedAtCompletion,
      cumulativeForecastCompletion,
      quarterlyForecastCompletion,
      forecastCost,
      actualCost,
      forecastRevenue,
      actualRevenue,
      forecastGrossProfit,
      actualGrossProfit,
      actualGrossProfitAsOfPreviousYear: previousYearActualGrossProfit,
      grossProfitAsOfCurrentQuarter,
      atCompletion: revisedContract - expectedAtCompletion,
    }
  })

  const summary = buildBurSummary(
    rows,
    periods,
    previousYearLabel,
    snapshotMap,
    periodSelection,
    ohInputs
  )

  return {
    periods,
    rows,
    summary,
    asOfLabel: `${periodSelection.quarter}-${String(selectedYear).slice(-2)}`,
    previousYearLabel,
    message:
      rows.length === 0
        ? 'No open PCR snapshots were found for this quarter and year. Closed projects are hidden here by design.'
        : '',
  }
}

function buildBurSummary(
  rows: BurRow[],
  periods: PeriodMeta[],
  previousYearLabel: string,
  snapshotMap: Map<string, PcrSnapshotRecord>,
  periodSelection: PeriodSelection,
  ohInputs: Record<string, string>
): BurSummary {
  const summary: BurSummary = {
    originalContract: 0,
    variationContract: 0,
    revisedContract: 0,
    originalBudget: 0,
    variationBudget: 0,
    revisedBudget: 0,
    incurred: 0,
    expectedAtCompletion: 0,
    forecastCost: {},
    actualCost: { [previousYearLabel]: 0 },
    forecastRevenue: {},
    actualRevenue: { [previousYearLabel]: 0 },
    forecastGrossProfit: {},
    actualGrossProfit: { [previousYearLabel]: 0 },
    forecastOh: {},
    actualOh: { [previousYearLabel]: 0 },
    forecastOhPercent: { [previousYearLabel]: 0 },
    actualOhPercent: { [previousYearLabel]: 0 },
    forecastNetProfit: { [previousYearLabel]: 0 },
    actualNetProfit: { [previousYearLabel]: 0 },
    grossProfitAsOfCurrentQuarter: 0,
    atCompletion: 0,
  }

  periods.forEach((period) => {
    summary.forecastCost[period.key] = 0
    summary.actualCost[period.key] = 0
    summary.forecastRevenue[period.key] = 0
    summary.actualRevenue[period.key] = 0
    summary.forecastGrossProfit[period.key] = 0
    summary.actualGrossProfit[period.key] = 0
    summary.forecastOh[period.key] = normalizeAmountInput(
      ohInputs[getOhInputKey(periodSelection, period.key)]
    )
    summary.actualOh[period.key] = 0
    summary.forecastOhPercent[period.key] = 0
    summary.actualOhPercent[period.key] = 0
    summary.forecastNetProfit[period.key] = 0
    summary.actualNetProfit[period.key] = 0
  })

  rows.forEach((row) => {
    summary.originalContract += row.originalContract
    summary.variationContract += row.variationContract
    summary.revisedContract += row.revisedContract
    summary.originalBudget += row.originalBudget
    summary.variationBudget += row.variationBudget
    summary.revisedBudget += row.revisedBudget
    summary.incurred += row.incurred
    summary.expectedAtCompletion += row.expectedAtCompletion
    summary.actualCost[previousYearLabel] += row.actualCost[previousYearLabel] || 0
    summary.actualRevenue[previousYearLabel] += row.actualRevenue[previousYearLabel] || 0
    summary.actualGrossProfit[previousYearLabel] +=
      row.actualGrossProfitAsOfPreviousYear || 0
    summary.grossProfitAsOfCurrentQuarter += row.grossProfitAsOfCurrentQuarter
    summary.atCompletion += row.atCompletion

    periods.forEach((period) => {
      summary.forecastCost[period.key] += row.forecastCost[period.key] || 0
      summary.actualCost[period.key] += row.actualCost[period.key] || 0
      summary.forecastRevenue[period.key] += row.forecastRevenue[period.key] || 0
      summary.actualRevenue[period.key] += row.actualRevenue[period.key] || 0
      summary.forecastGrossProfit[period.key] +=
        row.forecastGrossProfit[period.key] || 0
      summary.actualGrossProfit[period.key] += row.actualGrossProfit[period.key] || 0
    })
  })

  rows.forEach((row) => {
    const previousYearSnapshot = getSnapshotForQuarter(
      snapshotMap,
      row.projectNumber,
      row.projectName,
      'Q4',
      Number(periodSelection.year) - 1
    )

    summary.actualOh[previousYearLabel] += getSnapshotCategoryActual(previousYearSnapshot, 'foh')

    periods.forEach((period) => {
      const currentSnapshot = getSnapshotForPeriod(
        snapshotMap,
        row.projectNumber,
        row.projectName,
        period
      )
      const previousSnapshot = getPreviousSnapshotForPeriod(
        snapshotMap,
        row.projectNumber,
        row.projectName,
        period
      )

      summary.actualOh[period.key] += Math.max(
        getSnapshotCategoryActual(currentSnapshot, 'foh') -
          getSnapshotCategoryActual(previousSnapshot, 'foh'),
        0
      )
    })
  })

  summary.actualOhPercent[previousYearLabel] =
    safeRatio(summary.actualOh[previousYearLabel], summary.actualCost[previousYearLabel]) * 100
  summary.actualNetProfit[previousYearLabel] =
    summary.actualGrossProfit[previousYearLabel] - summary.actualOh[previousYearLabel]

  periods.forEach((period) => {
    summary.forecastOhPercent[period.key] =
      safeRatio(summary.forecastOh[period.key], summary.forecastCost[period.key]) * 100
    summary.actualOhPercent[period.key] =
      safeRatio(summary.actualOh[period.key], summary.actualCost[period.key]) * 100
    summary.forecastNetProfit[period.key] =
      summary.forecastGrossProfit[period.key] - summary.forecastOh[period.key]
    summary.actualNetProfit[period.key] =
      summary.actualGrossProfit[period.key] - summary.actualOh[period.key]
  })

  return summary
}

function buildPeriods(selectedYear: number, maxCompletionYear: number): PeriodMeta[] {
  const periods: PeriodMeta[] = quarterOrder.map((quarter) => ({
    key: getQuarterPeriodKey(quarter, selectedYear),
    label: getQuarterPeriodKey(quarter, selectedYear),
    kind: 'quarter' as const,
    year: selectedYear,
    quarter,
  }))

  for (let year = selectedYear + 1; year <= maxCompletionYear; year += 1) {
    periods.push({
      key: `Y-${String(year).slice(-2)}`,
      label: `Y-${String(year).slice(-2)}`,
      kind: 'year',
      year,
    })
  }

  return periods
}

function buildSnapshotMap(snapshots: PcrSnapshotRecord[]) {
  const map = new Map<string, PcrSnapshotRecord>()

  snapshots.forEach((snapshot) => {
    map.set(
      `${getProjectKey(snapshot.project_number, snapshot.project_name)}|${snapshot.quarter}|${snapshot.year}`,
      snapshot
    )
  })

  return map
}

function buildTenderLocationMap(tenderLogs: TenderLog[]) {
  const map = new Map<string, string>()

  tenderLogs.forEach((tender) => {
    if (tender.projectName && tender.projectLocation) {
      map.set(tender.projectName, tender.projectLocation)
    }
  })

  return map
}

function getSnapshotForQuarter(
  snapshotMap: Map<string, PcrSnapshotRecord>,
  projectNumber: string,
  projectName: string,
  quarter: Quarter,
  year: number
) {
  return (
    snapshotMap.get(`${getProjectKey(projectNumber, projectName)}|${quarter}|${year}`) ||
    null
  )
}

function getSnapshotForPeriod(
  snapshotMap: Map<string, PcrSnapshotRecord>,
  projectNumber: string,
  projectName: string,
  period: PeriodMeta
) {
  if (period.kind === 'quarter' && period.quarter) {
    return getSnapshotForQuarter(
      snapshotMap,
      projectNumber,
      projectName,
      period.quarter,
      period.year
    )
  }

  return getSnapshotForQuarter(snapshotMap, projectNumber, projectName, 'Q4', period.year)
}

function getPreviousSnapshotForPeriod(
  snapshotMap: Map<string, PcrSnapshotRecord>,
  projectNumber: string,
  projectName: string,
  period: PeriodMeta
) {
  if (period.kind === 'year') {
    return getSnapshotForQuarter(snapshotMap, projectNumber, projectName, 'Q4', period.year - 1)
  }

  const quarterIndex = quarterOrder.indexOf(period.quarter || 'Q1')

  if (quarterIndex <= 0) {
    return getSnapshotForQuarter(snapshotMap, projectNumber, projectName, 'Q4', period.year - 1)
  }

  return getSnapshotForQuarter(
    snapshotMap,
    projectNumber,
    projectName,
    quarterOrder[quarterIndex - 1],
    period.year
  )
}

function getSnapshotReport(snapshot: PcrSnapshotRecord | null) {
  return snapshot?.report_data?.report || null
}

function getSnapshotTotalActual(snapshot: PcrSnapshotRecord | null) {
  return getSnapshotReport(snapshot)?.totals.actualIncurredCost || 0
}

function getSnapshotExpectedAtCompletion(snapshot: PcrSnapshotRecord | null) {
  return getSnapshotReport(snapshot)?.totals.totalExpectedCostAtCompletion || 0
}

function getSnapshotRevisedContract(snapshot: PcrSnapshotRecord | null) {
  return getSnapshotReport(snapshot)?.revisedContractValue || 0
}

function getSnapshotCategoryActual(
  snapshot: PcrSnapshotRecord | null,
  categoryKey: PcrCategoryKey
) {
  return (
    getSnapshotReport(snapshot)?.rows.find((row) => row.key === categoryKey)
      ?.actualIncurredCost || 0
  )
}

function getRevenueCompletionYear(
  revenues: ContractRevenue[],
  projectNumber: string,
  projectName: string
) {
  const revenue =
    revenues.find(
      (entry) =>
        entry.projectNumber === projectNumber && entry.projectName === projectName
    ) ||
    revenues.find((entry) => entry.projectNumber === projectNumber) ||
    revenues.find((entry) => entry.projectName === projectName) ||
    null

  if (!revenue?.completionDate) {
    return null
  }

  const parsedDate = new Date(revenue.completionDate)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear()
}

function upsertBurSnapshot(records: BurSnapshotRecord[], nextRecord: BurSnapshotRecord) {
  const remaining = records.filter((record) => record.id !== nextRecord.id)

  return [nextRecord, ...remaining].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year
    }

    return right.quarter.localeCompare(left.quarter)
  })
}

function getProjectKey(projectNumber: string, projectName: string) {
  return `${projectNumber}||${projectName}`
}

function getQuarterPeriodKey(quarter: Quarter, year: number) {
  return `${quarter}-${String(year).slice(-2)}`
}

function getCumulativeInputKey(
  periodSelection: PeriodSelection,
  rowKey: string,
  periodKey: string
) {
  return [periodSelection.quarter, periodSelection.year, rowKey, periodKey].join('|')
}

function getOhInputKey(periodSelection: PeriodSelection, periodKey: string) {
  return [periodSelection.quarter, periodSelection.year, periodKey].join('|')
}

function normalizeProjectStatus(value: string | undefined | null): ProjectLifecycleStatus {
  return String(value || '').toLowerCase() === 'closed' ? 'closed' : 'open'
}

function normalizePercentage(value: string | number | undefined) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.min(Math.max(parsed, 0), 100)
}

function normalizeAmountInput(value: string | number | undefined) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(parsed, 0)
}

function isPeriodWithinSelectedQuarter(period: PeriodMeta, selectedQuarterIndex: number) {
  if (period.kind === 'year') {
    return false
  }

  const periodQuarterIndex = quarterOrder.indexOf(period.quarter || 'Q1')
  return periodQuarterIndex <= selectedQuarterIndex
}

function safeRatio(numerator: number, denominator: number) {
  if (!denominator) {
    return 0
  }

  return numerator / denominator
}

function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function HeaderCell({
  children,
  className = '',
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  rowSpan?: number
  colSpan?: number
}) {
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`border border-slate-300 px-3 py-2 text-center font-semibold text-slate-900 ${className}`}
    >
      {children}
    </th>
  )
}

function StickyHeaderCell({
  children,
  left,
  width,
  rowSpan,
}: {
  children: React.ReactNode
  left: number
  width: number
  rowSpan?: number
}) {
  return (
    <th
      rowSpan={rowSpan}
      className="sticky border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-900"
      style={{ left, minWidth: width, width, zIndex: 35 }}
    >
      {children}
    </th>
  )
}

function BodyCell({
  children,
  align = 'left',
  className = '',
  colSpan,
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-300 px-3 py-2 text-slate-900 ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
            ? 'text-center'
            : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  )
}

function StickyBodyCell({
  children,
  left,
  width,
}: {
  children: React.ReactNode
  left: number
  width: number
}) {
  return (
    <td
      className="sticky border border-slate-300 bg-white px-3 py-2 text-left text-slate-900"
      style={{ left, minWidth: width, width, zIndex: 15 }}
    >
      {children}
    </td>
  )
}

function FooterCell({
  children,
  align = 'left',
  colSpan,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </td>
  )
}

function StickyFooterCell({
  children,
  left,
  width,
}: {
  children: React.ReactNode
  left: number
  width: number
}) {
  return (
    <td
      className="sticky border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900"
      style={{ left, minWidth: width, width, zIndex: 25 }}
    >
      {children}
    </td>
  )
}
