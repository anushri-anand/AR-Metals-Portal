'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import { fetchAPI } from '@/lib/api'
import { ContractRevenue, formatMoney, getContractRevenues } from '@/lib/estimation-storage'

type ProjectSelection = {
  projectNumber: string
  projectName: string
}

type PeriodSelection = {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  year: string
}

type ProjectLifecycleStatus = 'open' | 'closed'

type MeResponse = {
  role: string
}

type PurchaseItem = {
  line_number: number
  item_description?: string
  quantity?: string | number
  unit?: string
  rate?: string | number
  amount?: string | number
}

type PurchaseOrderRecord = {
  id: number
  order_type: 'project' | 'asset' | 'inventory'
  status?: 'draft' | 'submitted' | 'approved'
  po_number: string
  project_number: string
  project_name: string
  cost_code: string
  po_amount: string | number
  purchase_items?: PurchaseItem[]
}

type PaymentDeliveryItem = {
  id: number
  line_number: number
  item_description: string
  unit: string
  rate: string | number
  received_quantity: string | number
}

type PaymentRecord = {
  id: number
  po_number: string
  project_number: string
  project_name: string
  delivery_items: PaymentDeliveryItem[]
}

type InventoryIssuanceRecord = {
  id: number
  project_name: string
  project_number: string
  cost_code: string
  amount: string | number
}

type PettyCashVoucherItem = {
  id: number
  project_name: string
  project_number: string
  cost_code: string
  amount_exc_vat: string | number
}

type PettyCashVoucher = {
  id: number
  items: PettyCashVoucherItem[]
}

type SalaryActualIncurredCostRow = {
  sn: number
  project_name: string
  project_number: string
  cost_code: string
  amount: string | number
}

type CategoryKey =
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

type ReportRow = {
  key: CategoryKey
  description: string
  originalBudget: number
  variationBudget: number
  revisedBudget: number
  totalCommittedCost: number
  actualIncurredCost: number
  balanceCommittedCost: number
  remainingCostRequired: number
  totalExpectedCostAtCompletion: number
  savingOverrun: number
}

type Totals = Omit<ReportRow, 'key' | 'description'>

type GrossProfit = {
  plannedAmount: number
  plannedPercent: number
  actualAmount: number
  actualPercent: number
  varianceAmount: number
  variancePercent: number
}

type BuiltReport = {
  rows: ReportRow[]
  totals: Totals
  originalContract: number
  agreedVariations: number
  revisedContractValue: number
  grossProfit: GrossProfit
  message: string
}

type ReportSnapshotData = {
  selection: ProjectSelection
  periodSelection: PeriodSelection
  projectStatus: ProjectLifecycleStatus
  report: BuiltReport
}

type PcrSnapshotRecord = {
  id: number
  project_number: string
  project_name: string
  quarter: PeriodSelection['quarter']
  year: number
  status: 'submitted' | 'approved'
  report_data: ReportSnapshotData
  submitted_by: string
  approved_by: string
  submitted_at: string
  approved_at: string | null
}

type DataState = {
  revenues: ContractRevenue[]
  projectOrders: PurchaseOrderRecord[]
  assetOrders: PurchaseOrderRecord[]
  paymentEntries: PaymentRecord[]
  inventoryIssuances: InventoryIssuanceRecord[]
  pettyCashVouchers: PettyCashVoucher[]
  salaryRows: SalaryActualIncurredCostRow[]
}

const categoryOrder: Array<{ key: CategoryKey; label: string }> = [
  { key: 'materials', label: 'Materials' },
  { key: 'labour', label: 'Labour' },
  { key: 'machining', label: 'Machining' },
  { key: 'coating', label: 'Coating' },
  { key: 'consumables', label: 'Consumables' },
  { key: 'subcontracts', label: 'Subcontracts' },
  { key: 'freightCustoms', label: 'Freight & Customs' },
  { key: 'prelims', label: 'Prelims' },
  { key: 'foh', label: 'FOH' },
  { key: 'commitments', label: 'Commitments' },
  { key: 'contingencies', label: 'Contingencies' },
]

const emptyDataState: DataState = {
  revenues: [],
  projectOrders: [],
  assetOrders: [],
  paymentEntries: [],
  inventoryIssuances: [],
  pettyCashVouchers: [],
  salaryRows: [],
}

export default function PcrClient() {
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear + index)
  const [selection, setSelection] = useState<ProjectSelection>({
    projectNumber: '',
    projectName: '',
  })
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>({
    quarter: 'Q1',
    year: String(currentYear),
  })
  const [projectStatus, setProjectStatus] = useState<ProjectLifecycleStatus>('open')
  const [remainingCostInputs, setRemainingCostInputs] = useState<Record<string, string>>({})
  const [data, setData] = useState<DataState>(emptyDataState)
  const [snapshots, setSnapshots] = useState<PcrSnapshotRecord[]>([])
  const [reviewSnapshotId, setReviewSnapshotId] = useState<number | null>(null)
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [
          revenues,
          projectOrders,
          assetOrders,
          paymentEntries,
          inventoryIssuances,
          pettyCashVouchers,
          salaryRows,
          snapshotData,
          me,
        ] = await Promise.all([
          getContractRevenues(),
          fetchAPI('/procurement/purchase-order/?order_type=project'),
          fetchAPI('/procurement/purchase-order/?order_type=asset'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/procurement/inventory-issuance/'),
          fetchAPI('/procurement/petty-cash/'),
          fetchAPI('/employees/salary/actual-incurred-cost/'),
          fetchAPI('/procurement/pcr/'),
          fetchAPI('/accounts/me/'),
        ])

        setData({
          revenues,
          projectOrders: Array.isArray(projectOrders) ? projectOrders : [],
          assetOrders: Array.isArray(assetOrders) ? assetOrders : [],
          paymentEntries: Array.isArray(paymentEntries) ? paymentEntries : [],
          inventoryIssuances: Array.isArray(inventoryIssuances) ? inventoryIssuances : [],
          pettyCashVouchers: Array.isArray(pettyCashVouchers) ? pettyCashVouchers : [],
          salaryRows: Array.isArray(salaryRows) ? salaryRows : [],
        })
        setSnapshots(Array.isArray(snapshotData) ? (snapshotData as PcrSnapshotRecord[]) : [])
        setRole((me as MeResponse)?.role || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PCR data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const liveReport = useMemo(
    () => buildPcrReport(selection, periodSelection, data, remainingCostInputs),
    [data, periodSelection, remainingCostInputs, selection]
  )

  const matchingSnapshot = useMemo(
    () =>
      snapshots.find(
        (snapshot) =>
          snapshot.project_number === selection.projectNumber &&
          snapshot.project_name === selection.projectName &&
          snapshot.quarter === periodSelection.quarter &&
          String(snapshot.year) === periodSelection.year
      ) || null,
    [periodSelection, selection, snapshots]
  )

  const reviewSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === reviewSnapshotId) || null,
    [reviewSnapshotId, snapshots]
  )

  useEffect(() => {
    const nextProjectStatus = matchingSnapshot?.report_data?.projectStatus
    setProjectStatus(nextProjectStatus === 'closed' ? 'closed' : 'open')
  }, [matchingSnapshot])

  async function handleSubmit() {
    if (!selection.projectNumber || !selection.projectName) {
      setError('Select a project number and project name first.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const savedSnapshot = await fetchAPI('/procurement/pcr/', {
        method: 'POST',
        body: JSON.stringify({
          project_number: selection.projectNumber,
          project_name: selection.projectName,
          quarter: periodSelection.quarter,
          year: Number(periodSelection.year),
          report_data: {
            selection,
            periodSelection,
            projectStatus,
            report: liveReport,
          },
        }),
      })

      setSnapshots((prev) => upsertSnapshot(prev, savedSnapshot as PcrSnapshotRecord))
      setReviewSnapshotId((savedSnapshot as PcrSnapshotRecord).id)
      setMessage('PCR submitted for approval.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit PCR.')
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove(snapshotId: number) {
    setApprovingId(snapshotId)
    setError('')
    setMessage('')

    try {
      const approvedSnapshot = await fetchAPI(`/procurement/pcr/${snapshotId}/approve/`, {
        method: 'POST',
      })

      setSnapshots((prev) => upsertSnapshot(prev, approvedSnapshot as PcrSnapshotRecord))
      setMessage('PCR approved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve PCR.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">PROJECT COST REPORT</h1>
        <p className="mt-2 text-slate-700">
          Review contract budget, committed cost, actual incurred cost, and gross
          profit for the selected project.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Remaining Cost Required starts from the system-calculated value, but you
          can edit it directly in the table when needed.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          <ProjectSelectFields
            projectNumber={selection.projectNumber}
            projectName={selection.projectName}
            onChange={({ projectNumber, projectName }) =>
              setSelection({ projectNumber, projectName })
            }
          />

          <Field label="Quarter">
            <select
              value={periodSelection.quarter}
              onChange={(event) =>
                setPeriodSelection((prev) => ({
                  ...prev,
                  quarter: event.target.value as PeriodSelection['quarter'],
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quarter) => (
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
              {role === 'admin' && matchingSnapshot && matchingSnapshot.status !== 'approved' ? (
                <button
                  type="button"
                  onClick={() => handleApprove(matchingSnapshot.id)}
                  disabled={approvingId === matchingSnapshot.id}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                >
                  {approvingId === matchingSnapshot.id ? 'Approving...' : 'Approve'}
                </button>
              ) : null}
            </div>
            {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          </Field>

          <Field label="Project Status">
            <select
              value={projectStatus}
              onChange={(event) =>
                setProjectStatus(event.target.value as ProjectLifecycleStatus)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>
      </div>

      <PcrReportSection
        loading={loading}
        title="Current Report"
        selection={selection}
        periodSelection={periodSelection}
        projectStatus={projectStatus}
        report={liveReport}
        editableRemainingCost
        remainingCostInputs={remainingCostInputs}
        onRemainingCostChange={(rowKey, value) =>
          setRemainingCostInputs((prev) => ({
            ...prev,
            [getRemainingCostKey(selection, periodSelection, rowKey)]: value,
          }))
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Saved PCR Entries</h2>
          <p className="mt-2 text-sm text-slate-600">
            Submitted quarter-wise snapshots are listed here for review and approval.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Quarter</HeaderCell>
                <HeaderCell>Year</HeaderCell>
                <HeaderCell>Project Status</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Submitted By</HeaderCell>
                <HeaderCell>Submitted At</HeaderCell>
                <HeaderCell>Approved By</HeaderCell>
                <HeaderCell>Approved At</HeaderCell>
                <HeaderCell>Review</HeaderCell>
                <HeaderCell>Approval</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {snapshots.length > 0 ? (
                snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="bg-white">
                    <BodyCell>{snapshot.project_number}</BodyCell>
                    <BodyCell>{snapshot.project_name}</BodyCell>
                    <BodyCell>{snapshot.quarter}</BodyCell>
                    <BodyCell>{snapshot.year}</BodyCell>
                    <BodyCell className="capitalize">
                      {snapshot.report_data?.projectStatus === 'closed' ? 'Closed' : 'Open'}
                    </BodyCell>
                    <BodyCell className="capitalize">{snapshot.status}</BodyCell>
                    <BodyCell>{snapshot.submitted_by || '-'}</BodyCell>
                    <BodyCell>{formatDateTime(snapshot.submitted_at)}</BodyCell>
                    <BodyCell>{snapshot.approved_by || '-'}</BodyCell>
                    <BodyCell>{formatDateTime(snapshot.approved_at)}</BodyCell>
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
                      {role === 'admin' && snapshot.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(snapshot.id)}
                          disabled={approvingId === snapshot.id}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {approvingId === snapshot.id ? 'Approving...' : 'Approve'}
                        </button>
                      ) : (
                        '-'
                      )}
                    </BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={12}>
                    {loading ? 'Loading saved PCR entries...' : 'No PCR entries have been saved yet.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewSnapshot ? (
        <PcrReportSection
          title="Saved Snapshot Review"
          selection={reviewSnapshot.report_data?.selection || {
            projectNumber: reviewSnapshot.project_number,
            projectName: reviewSnapshot.project_name,
          }}
          periodSelection={reviewSnapshot.report_data?.periodSelection || {
            quarter: reviewSnapshot.quarter,
            year: String(reviewSnapshot.year),
          }}
          projectStatus={
            reviewSnapshot.report_data?.projectStatus === 'closed' ? 'closed' : 'open'
          }
          report={reviewSnapshot.report_data?.report || createEmptyReport()}
          snapshotStatus={reviewSnapshot.status}
          snapshotMeta={{
            submittedBy: reviewSnapshot.submitted_by,
            submittedAt: reviewSnapshot.submitted_at,
            approvedBy: reviewSnapshot.approved_by,
            approvedAt: reviewSnapshot.approved_at,
          }}
        />
      ) : null}
    </div>
  )
}

function PcrReportSection({
  title,
  selection,
  periodSelection,
  projectStatus,
  report,
  loading = false,
  editableRemainingCost = false,
  remainingCostInputs = {},
  onRemainingCostChange,
  snapshotStatus,
  snapshotMeta,
}: {
  title: string
  selection: ProjectSelection
  periodSelection: PeriodSelection
  projectStatus: ProjectLifecycleStatus
  report: BuiltReport
  loading?: boolean
  editableRemainingCost?: boolean
  remainingCostInputs?: Record<string, string>
  onRemainingCostChange?: (rowKey: CategoryKey, value: string) => void
  snapshotStatus?: string
  snapshotMeta?: {
    submittedBy: string
    submittedAt: string | null
    approvedBy: string
    approvedAt: string | null
  }
}) {
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
        {snapshotMeta ? (
          <p className="mt-2 text-sm text-slate-600">
            Submitted by {snapshotMeta.submittedBy || '-'} on{' '}
            {formatDateTime(snapshotMeta.submittedAt)}. Approved by{' '}
            {snapshotMeta.approvedBy || '-'} on {formatDateTime(snapshotMeta.approvedAt)}.
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="p-8 text-slate-700">Loading PCR data...</div>
      ) : !selection.projectNumber || !selection.projectName ? (
        <div className="p-8 text-slate-700">
          Select a project number and project name to view the report.
        </div>
      ) : (
        <div className="space-y-6 p-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr,0.9fr]">
            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <SummaryInfoRow label="Project Name" value={selection.projectName} />
                  <SummaryInfoRow label="Project #" value={selection.projectNumber} />
                  <SummaryInfoRow
                    label="Status"
                    value={projectStatus === 'closed' ? 'Closed' : 'Open'}
                  />
                  <SummaryInfoRow label="Quarter" value={periodSelection.quarter} />
                  <SummaryInfoRow label="Year" value={periodSelection.year} />
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <SummaryInfoRow
                    label="Original Contract"
                    value={formatMoney(report.originalContract)}
                  />
                  <SummaryInfoRow
                    label="Agreed Variations"
                    value={formatMoney(report.agreedVariations)}
                  />
                  <SummaryInfoRow
                    label="Revised Contract Value"
                    value={formatMoney(report.revisedContractValue)}
                    strong
                  />
                </tbody>
              </table>
            </div>
          </div>

          {report.message ? <p className="text-sm text-slate-600">{report.message}</p> : null}

          <div className="max-h-[72vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[1560px] border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-900">
                <tr>
                  <HeaderCell className="w-[70px]">SN</HeaderCell>
                  <HeaderCell className="w-[220px]">Description</HeaderCell>
                  <HeaderCell>Original Budget</HeaderCell>
                  <HeaderCell>Variation Budget</HeaderCell>
                  <HeaderCell>Revised Budget</HeaderCell>
                  <HeaderCell>Total Committed Cost</HeaderCell>
                  <HeaderCell>Actual Incurred Cost</HeaderCell>
                  <HeaderCell>Balance Committed Cost</HeaderCell>
                  <HeaderCell>Remaining Cost Required</HeaderCell>
                  <HeaderCell>Total Expected Cost At Completion</HeaderCell>
                  <HeaderCell>Saving / Overrun</HeaderCell>
                </tr>
              </thead>

              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={row.key} className="bg-white">
                    <BodyCell>{index + 1}</BodyCell>
                    <BodyCell>{row.description}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.originalBudget)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.variationBudget)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.revisedBudget)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.totalCommittedCost)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.actualIncurredCost)}</BodyCell>
                    <BodyCell align="right">{formatMoney(row.balanceCommittedCost)}</BodyCell>
                    <BodyCell>
                      {editableRemainingCost ? (
                        <input
                          type="number"
                          step="0.01"
                          value={
                            remainingCostInputs[
                              getRemainingCostKey(selection, periodSelection, row.key)
                            ] ?? row.remainingCostRequired.toFixed(2)
                          }
                          onChange={(event) =>
                            onRemainingCostChange?.(row.key, event.target.value)
                          }
                          className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-right text-slate-900"
                        />
                      ) : (
                        <div className="text-right">{formatMoney(row.remainingCostRequired)}</div>
                      )}
                    </BodyCell>
                    <BodyCell align="right">
                      {formatMoney(row.totalExpectedCostAtCompletion)}
                    </BodyCell>
                    <BodyCell
                      align="right"
                      className={row.savingOverrun < 0 ? 'text-red-700' : 'text-slate-700'}
                    >
                      {formatMoney(row.savingOverrun)}
                    </BodyCell>
                  </tr>
                ))}
              </tbody>

              <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white">
                <tr>
                  <FooterCell colSpan={2}>TOTAL</FooterCell>
                  <FooterCell align="right">{formatMoney(report.totals.originalBudget)}</FooterCell>
                  <FooterCell align="right">{formatMoney(report.totals.variationBudget)}</FooterCell>
                  <FooterCell align="right">{formatMoney(report.totals.revisedBudget)}</FooterCell>
                  <FooterCell align="right">
                    {formatMoney(report.totals.totalCommittedCost)}
                  </FooterCell>
                  <FooterCell align="right">
                    {formatMoney(report.totals.actualIncurredCost)}
                  </FooterCell>
                  <FooterCell align="right">
                    {formatMoney(report.totals.balanceCommittedCost)}
                  </FooterCell>
                  <FooterCell align="right">
                    {formatMoney(report.totals.remainingCostRequired)}
                  </FooterCell>
                  <FooterCell align="right">
                    {formatMoney(report.totals.totalExpectedCostAtCompletion)}
                  </FooterCell>
                  <FooterCell align="right">{formatMoney(report.totals.savingOverrun)}</FooterCell>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <HeaderCell className="w-[200px]">GROSS PROFIT</HeaderCell>
                  <HeaderCell className="w-[220px]">AMOUNT</HeaderCell>
                  <HeaderCell>PERCENT</HeaderCell>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <BodyCell className="font-semibold text-slate-900">PLANNED</BodyCell>
                  <BodyCell align="right">{formatMoney(report.grossProfit.plannedAmount)}</BodyCell>
                  <BodyCell align="right">
                    {formatPercent(report.grossProfit.plannedPercent)}
                  </BodyCell>
                </tr>
                <tr className="bg-white">
                  <BodyCell className="font-semibold text-slate-900">ACTUAL</BodyCell>
                  <BodyCell align="right">{formatMoney(report.grossProfit.actualAmount)}</BodyCell>
                  <BodyCell align="right">
                    {formatPercent(report.grossProfit.actualPercent)}
                  </BodyCell>
                </tr>
                <tr className="bg-white">
                  <BodyCell className="font-semibold text-slate-900">VARIANCE</BodyCell>
                  <BodyCell
                    align="right"
                    className={report.grossProfit.varianceAmount < 0 ? 'text-red-700' : 'text-slate-700'}
                  >
                    {formatMoney(report.grossProfit.varianceAmount)}
                  </BodyCell>
                  <BodyCell
                    align="right"
                    className={report.grossProfit.variancePercent < 0 ? 'text-red-700' : 'text-slate-700'}
                  >
                    {formatPercent(report.grossProfit.variancePercent)}
                  </BodyCell>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function buildPcrReport(
  selection: ProjectSelection,
  periodSelection: PeriodSelection,
  data: DataState,
  remainingCostInputs: Record<string, string>
): BuiltReport {
  const revenue = findRevenueEntry(data.revenues, selection)
  const originalContract = toNumber(revenue?.contractValue)
  const agreedVariations = (revenue?.variations || []).reduce(
    (total, variation) => total + toNumber(variation.amount),
    0
  )
  const revisedContractValue = originalContract + agreedVariations
  const budgetTotals = createCategoryAmountMap()
  const variationBudgetTotals = createCategoryAmountMap()
  const committedTotals = createCategoryAmountMap()
  const actualTotals = createCategoryAmountMap()

  if (revenue) {
    budgetTotals.materials += toNumber(revenue.budgetMaterial)
    budgetTotals.labour +=
      toNumber(revenue.budgetProductionLabour) +
      toNumber(revenue.budgetInstallationLabour)
    budgetTotals.machining += toNumber(revenue.budgetMachining)
    budgetTotals.coating += toNumber(revenue.budgetCoating)
    budgetTotals.consumables += toNumber(revenue.budgetConsumables)
    budgetTotals.subcontracts += toNumber(revenue.budgetSubcontracts)
    budgetTotals.freightCustoms += toNumber(revenue.budgetFreightCustom)
    budgetTotals.prelims += toNumber(revenue.budgetPrelims)
    budgetTotals.foh += toNumber(revenue.budgetFoh)
    budgetTotals.commitments += toNumber(revenue.budgetCommitments)
    budgetTotals.contingencies += toNumber(revenue.budgetContingencies)

    variationBudgetTotals.materials += toNumber(revenue.variationBudgetMaterial)
    variationBudgetTotals.labour +=
      toNumber(revenue.variationBudgetProductionLabour) +
      toNumber(revenue.variationBudgetInstallationLabour)
    variationBudgetTotals.machining += toNumber(revenue.variationBudgetMachining)
    variationBudgetTotals.coating += toNumber(revenue.variationBudgetCoating)
    variationBudgetTotals.consumables += toNumber(revenue.variationBudgetConsumables)
    variationBudgetTotals.subcontracts += toNumber(revenue.variationBudgetSubcontracts)
    variationBudgetTotals.freightCustoms += toNumber(revenue.variationBudgetFreightCustom)
    variationBudgetTotals.prelims += toNumber(revenue.variationBudgetPrelims)
    variationBudgetTotals.foh += toNumber(revenue.variationBudgetFoh)
    variationBudgetTotals.commitments += toNumber(revenue.variationBudgetCommitments)
    variationBudgetTotals.contingencies += toNumber(revenue.variationBudgetContingencies)
  }

  data.projectOrders
    .filter(
      (order) =>
        order.order_type === 'project' &&
        order.status !== 'draft' &&
        matchesProject(
          order.project_number,
          order.project_name,
          selection.projectNumber,
          selection.projectName
        )
    )
    .forEach((order) => {
      addAmountByCostCode(committedTotals, order.cost_code, toNumber(order.po_amount))
    })

  data.assetOrders
    .filter((order) =>
      matchesProject(
        order.project_number,
        order.project_name,
        selection.projectNumber,
        selection.projectName
      )
    )
    .forEach((order) => {
      const assetAmount = (order.purchase_items || []).reduce(
        (total, item) => total + toNumber(item.amount),
        0
      )

      addAmountByCostCode(committedTotals, order.cost_code, assetAmount)
      addAmountByCostCode(actualTotals, order.cost_code, assetAmount)
    })

  data.inventoryIssuances
    .filter((issuance) =>
      matchesProject(
        issuance.project_number,
        issuance.project_name,
        selection.projectNumber,
        selection.projectName
      )
    )
    .forEach((issuance) => {
      const amount = toNumber(issuance.amount)
      addAmountByCostCode(committedTotals, issuance.cost_code, amount)
      addAmountByCostCode(actualTotals, issuance.cost_code, amount)
    })

  data.pettyCashVouchers.forEach((voucher) => {
    ;(voucher.items || [])
      .filter((item) =>
        matchesProject(
          item.project_number,
          item.project_name,
          selection.projectNumber,
          selection.projectName
        )
      )
      .forEach((item) => {
        const amount = toNumber(item.amount_exc_vat)
        addAmountByCostCode(committedTotals, item.cost_code, amount)
        addAmountByCostCode(actualTotals, item.cost_code, amount)
      })
  })

  data.salaryRows
    .filter((row) =>
      matchesProject(
        row.project_number,
        row.project_name,
        selection.projectNumber,
        selection.projectName
      )
    )
    .forEach((row) => {
      const amount = toNumber(row.amount)
      addAmountByCostCode(committedTotals, row.cost_code, amount)
      addAmountByCostCode(actualTotals, row.cost_code, amount)
    })

  buildProjectActualTotals(data.paymentEntries, data.projectOrders, selection, actualTotals)

  const rows = categoryOrder.map(({ key, label }) => {
    const originalBudget = budgetTotals[key]
    const variationBudget = variationBudgetTotals[key]
    const revisedBudget = originalBudget + variationBudget
    const totalCommittedCost = committedTotals[key]
    const actualIncurredCost = actualTotals[key]
    const balanceCommittedCost = Math.max(totalCommittedCost - actualIncurredCost, 0)
    const defaultRemainingCostRequired = Math.max(
      revisedBudget - Math.max(totalCommittedCost, actualIncurredCost),
      0
    )
    const overrideValue = remainingCostInputs[
      getRemainingCostKey(selection, periodSelection, key)
    ]
    const parsedOverrideValue = Number(overrideValue)
    const remainingCostRequired =
      overrideValue !== '' && Number.isFinite(parsedOverrideValue)
        ? Math.max(parsedOverrideValue, 0)
        : defaultRemainingCostRequired
    const totalExpectedCostAtCompletion =
      actualIncurredCost + balanceCommittedCost + remainingCostRequired
    const savingOverrun = revisedBudget - totalExpectedCostAtCompletion

    return {
      key,
      description: label,
      originalBudget,
      variationBudget,
      revisedBudget,
      totalCommittedCost,
      actualIncurredCost,
      balanceCommittedCost,
      remainingCostRequired,
      totalExpectedCostAtCompletion,
      savingOverrun,
    }
  })

  const totals = rows.reduce<Totals>(
    (accumulator, row) => ({
      originalBudget: accumulator.originalBudget + row.originalBudget,
      variationBudget: accumulator.variationBudget + row.variationBudget,
      revisedBudget: accumulator.revisedBudget + row.revisedBudget,
      totalCommittedCost: accumulator.totalCommittedCost + row.totalCommittedCost,
      actualIncurredCost: accumulator.actualIncurredCost + row.actualIncurredCost,
      balanceCommittedCost:
        accumulator.balanceCommittedCost + row.balanceCommittedCost,
      remainingCostRequired:
        accumulator.remainingCostRequired + row.remainingCostRequired,
      totalExpectedCostAtCompletion:
        accumulator.totalExpectedCostAtCompletion +
        row.totalExpectedCostAtCompletion,
      savingOverrun: accumulator.savingOverrun + row.savingOverrun,
    }),
    {
      originalBudget: 0,
      variationBudget: 0,
      revisedBudget: 0,
      totalCommittedCost: 0,
      actualIncurredCost: 0,
      balanceCommittedCost: 0,
      remainingCostRequired: 0,
      totalExpectedCostAtCompletion: 0,
      savingOverrun: 0,
    }
  )

  const plannedAmount = originalContract - totals.originalBudget
  const plannedPercent = originalContract ? (plannedAmount / originalContract) * 100 : 0
  const actualAmount = revisedContractValue - totals.totalExpectedCostAtCompletion
  const actualPercent = revisedContractValue
    ? (actualAmount / revisedContractValue) * 100
    : 0

  return {
    rows,
    totals,
    originalContract,
    agreedVariations,
    revisedContractValue,
    grossProfit: {
      plannedAmount,
      plannedPercent,
      actualAmount,
      actualPercent,
      varianceAmount: actualAmount - plannedAmount,
      variancePercent: actualPercent - plannedPercent,
    },
    message: revenue
      ? ''
      : 'No contract revenue entry was found for this project yet. Budget columns are showing 0.00 until revenue is saved.',
  }
}

function createEmptyReport(): BuiltReport {
  return {
    rows: [],
    totals: {
      originalBudget: 0,
      variationBudget: 0,
      revisedBudget: 0,
      totalCommittedCost: 0,
      actualIncurredCost: 0,
      balanceCommittedCost: 0,
      remainingCostRequired: 0,
      totalExpectedCostAtCompletion: 0,
      savingOverrun: 0,
    },
    originalContract: 0,
    agreedVariations: 0,
    revisedContractValue: 0,
    grossProfit: {
      plannedAmount: 0,
      plannedPercent: 0,
      actualAmount: 0,
      actualPercent: 0,
      varianceAmount: 0,
      variancePercent: 0,
    },
    message: '',
  }
}

function getRemainingCostKey(
  selection: ProjectSelection,
  periodSelection: PeriodSelection,
  rowKey: CategoryKey
) {
  return [
    selection.projectNumber || '-',
    selection.projectName || '-',
    periodSelection.quarter,
    periodSelection.year,
    rowKey,
  ].join('|')
}

function buildProjectActualTotals(
  paymentEntries: PaymentRecord[],
  projectOrders: PurchaseOrderRecord[],
  selection: ProjectSelection,
  target: Record<CategoryKey, number>
) {
  const orderMap = new Map<string, PurchaseOrderRecord>()

  projectOrders.forEach((order) => {
    if (order.po_number) {
      orderMap.set(order.po_number, order)
    }
  })

  paymentEntries.forEach((entry) => {
    const order = orderMap.get(entry.po_number)

    if (
      !order ||
      order.order_type !== 'project' ||
      !matchesProject(
        entry.project_number || order.project_number,
        entry.project_name || order.project_name,
        selection.projectNumber,
        selection.projectName
      )
    ) {
      return
    }

    const actualAmount = (entry.delivery_items || []).reduce((total, item) => {
      const purchaseItem = (order.purchase_items || []).find(
        (candidate) => candidate.line_number === item.line_number
      )
      const rate = toNumber(purchaseItem?.rate) || toNumber(item.rate)
      const quantity = toNumber(item.received_quantity)
      return total + quantity * rate
    }, 0)

    addAmountByCostCode(target, order.cost_code, actualAmount)
  })
}

function findRevenueEntry(
  revenues: ContractRevenue[],
  selection: ProjectSelection
) {
  return (
    revenues.find(
      (revenue) =>
        revenue.projectNumber === selection.projectNumber &&
        revenue.projectName === selection.projectName
    ) ||
    revenues.find((revenue) => revenue.projectNumber === selection.projectNumber) ||
    revenues.find((revenue) => revenue.projectName === selection.projectName) ||
    null
  )
}

function createCategoryAmountMap(): Record<CategoryKey, number> {
  return {
    materials: 0,
    labour: 0,
    machining: 0,
    coating: 0,
    consumables: 0,
    subcontracts: 0,
    freightCustoms: 0,
    prelims: 0,
    foh: 0,
    commitments: 0,
    contingencies: 0,
  }
}

function addAmountByCostCode(
  target: Record<CategoryKey, number>,
  costCode: string,
  amount: number
) {
  const normalizedCostCode = String(costCode || '').trim().toLowerCase()

  if (normalizedCostCode === 'material') {
    target.materials += amount
    return
  }

  if (normalizedCostCode === 'labour') {
    target.labour += amount
    return
  }

  if (normalizedCostCode === 'machining') {
    target.machining += amount
    return
  }

  if (normalizedCostCode === 'coating') {
    target.coating += amount
    return
  }

  if (normalizedCostCode === 'consumables') {
    target.consumables += amount
    return
  }

  if (normalizedCostCode === 'subcontracts') {
    target.subcontracts += amount
    return
  }

  if (normalizedCostCode === 'freight&customs') {
    target.freightCustoms += amount
    return
  }

  if (normalizedCostCode === 'prelims') {
    target.prelims += amount
    return
  }

  if (normalizedCostCode === 'foh') {
    target.foh += amount
    return
  }

  if (normalizedCostCode === 'commitments') {
    target.commitments += amount
    return
  }

  if (normalizedCostCode === 'contingency' || normalizedCostCode === 'contingencies') {
    target.contingencies += amount
  }
}

function matchesProject(
  sourceProjectNumber: string,
  sourceProjectName: string,
  targetProjectNumber: string,
  targetProjectName: string
) {
  return (
    sourceProjectNumber === targetProjectNumber &&
    sourceProjectName === targetProjectName
  )
}

function toNumber(value: string | number | undefined | null) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function upsertSnapshot(records: PcrSnapshotRecord[], nextRecord: PcrSnapshotRecord) {
  const remainingRecords = records.filter((record) => record.id !== nextRecord.id)
  return [nextRecord, ...remainingRecords].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year
    }

    if (left.quarter !== right.quarter) {
      return right.quarter.localeCompare(left.quarter)
    }

    const projectCompare = left.project_number.localeCompare(right.project_number)
    if (projectCompare !== 0) {
      return projectCompare
    }

    return right.id - left.id
  })
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

function formatPercent(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
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

function HeaderCell({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`border border-slate-300 px-4 py-3 text-left font-semibold text-slate-900 ${className}`.trim()}
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
      className={`border border-slate-300 px-4 py-3 align-top text-slate-700 ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
            ? 'text-center'
            : 'text-left'
      } ${className}`.trim()}
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
  align?: 'left' | 'right' | 'center'
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-700 px-4 py-3 font-semibold ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
            ? 'text-center'
            : 'text-left'
      }`.trim()}
    >
      {children}
    </td>
  )
}
