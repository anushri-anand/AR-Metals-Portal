'use client'

import { useEffect, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import { fetchAPI } from '@/lib/api'
import {
  BoqItem,
  ContractRevenue,
  MasterListItem,
  TenderCosting,
  calculateCostSummary,
  createContractRevenue,
  formatMoney,
  getBoqItems,
  getContractRevenues,
  getMasterListItems,
  getTenderCostings,
} from '@/lib/estimation-storage'

const budgetFields = [
  { key: 'budgetMaterial', label: 'Material' },
  { key: 'budgetMachining', label: 'Machining' },
  { key: 'budgetCoating', label: 'Coating' },
  { key: 'budgetConsumables', label: 'Consumables' },
  { key: 'budgetSubcontracts', label: 'Subcontracts' },
  { key: 'budgetProductionLabour', label: 'Production Labour' },
  { key: 'budgetFreightCustom', label: 'Freight & Custom' },
  { key: 'budgetInstallationLabour', label: 'Installation Labour' },
  { key: 'budgetPrelims', label: 'Prelims' },
  { key: 'budgetFoh', label: 'FOH' },
  { key: 'budgetCommitments', label: 'Commitments' },
  { key: 'budgetContingencies', label: 'Contingencies' },
] as const

type BudgetKey = (typeof budgetFields)[number]['key']

const variationBudgetFields = [
  { key: 'variationBudgetMaterial', label: 'Material' },
  { key: 'variationBudgetMachining', label: 'Machining' },
  { key: 'variationBudgetCoating', label: 'Coating' },
  { key: 'variationBudgetConsumables', label: 'Consumables' },
  { key: 'variationBudgetSubcontracts', label: 'Subcontracts' },
  { key: 'variationBudgetProductionLabour', label: 'Production Labour' },
  { key: 'variationBudgetFreightCustom', label: 'Freight & Custom' },
  { key: 'variationBudgetInstallationLabour', label: 'Installation Labour' },
  { key: 'variationBudgetPrelims', label: 'Prelims' },
  { key: 'variationBudgetFoh', label: 'FOH' },
  { key: 'variationBudgetCommitments', label: 'Commitments' },
  { key: 'variationBudgetContingencies', label: 'Contingencies' },
] as const

type VariationBudgetKey = (typeof variationBudgetFields)[number]['key']

type RevenueForm = {
  projectNumber: string
  projectName: string
  contractValue: string
  startDate: string
  completionDate: string
} & Record<BudgetKey | VariationBudgetKey, string>

type VariationRow = {
  variationNumber: string
  amount: string
}

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  tender_number: string
  revision_number: string
  contract_po_ref?: string
}

const initialForm: RevenueForm = {
  projectNumber: '',
  projectName: '',
  contractValue: '',
  startDate: '',
  completionDate: '',
  budgetMaterial: '',
  budgetMachining: '',
  budgetCoating: '',
  budgetConsumables: '',
  budgetSubcontracts: '',
  budgetProductionLabour: '',
  budgetFreightCustom: '',
  budgetInstallationLabour: '',
  budgetPrelims: '',
  budgetFoh: '',
  budgetCommitments: '',
  budgetContingencies: '',
  variationBudgetMaterial: '',
  variationBudgetMachining: '',
  variationBudgetCoating: '',
  variationBudgetConsumables: '',
  variationBudgetSubcontracts: '',
  variationBudgetProductionLabour: '',
  variationBudgetFreightCustom: '',
  variationBudgetInstallationLabour: '',
  variationBudgetPrelims: '',
  variationBudgetFoh: '',
  variationBudgetCommitments: '',
  variationBudgetContingencies: '',
}

export default function ContractRevenueClient() {
  const [form, setForm] = useState<RevenueForm>(initialForm)
  const [variations, setVariations] = useState<VariationRow[]>([])
  const [revenues, setRevenues] = useState<ContractRevenue[]>([])
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [boqItems, setBoqItems] = useState<BoqItem[]>([])
  const [costings, setCostings] = useState<TenderCosting[]>([])
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [budgetMessage, setBudgetMessage] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedRevenues,
          savedProjects,
          savedBoqItems,
          savedCostings,
          savedMasterItems,
        ] = await Promise.all([
          getContractRevenues(),
          fetchAPI('/production/project-details/options/'),
          getBoqItems(),
          getTenderCostings(),
          getMasterListItems(),
        ])

        setRevenues(savedRevenues)
        setProjectOptions(savedProjects)
        setBoqItems(savedBoqItems)
        setCostings(savedCostings)
        setMasterItems(savedMasterItems)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load contract revenue.'
        )
      }
    }

    loadData()
  }, [])

  const contractValue = toNumber(form.contractValue)
  const agreedVariation = variations.reduce(
    (total, variation) => total + toNumber(variation.amount),
    0
  )
  const revisedContract = contractValue + agreedVariation
  const selectedProjectOption =
    projectOptions.find(
      (project) =>
        project.project_number === form.projectNumber ||
        project.project_name === form.projectName
    ) || null

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleProjectChange(value: {
    projectNumber: string
    projectName: string
    tenderNumber?: string
    revisionNumber?: string
  }) {
    const budget = getRevenueBudgetForProject(
      value,
      projectOptions,
      boqItems,
      costings,
      masterItems
    )

    setForm((prev) => ({
      ...prev,
      ...value,
      ...(budget?.values || {}),
    }))
    setBudgetMessage(budget?.message || '')
  }

  function handleAddVariation() {
    setVariations((prev) => [
      ...prev,
      {
        variationNumber: `VO# ${prev.length + 1}`,
        amount: '',
      },
    ])
  }

  function handleVariationChange(
    index: number,
    field: keyof VariationRow,
    value: string
  ) {
    setVariations((prev) =>
      prev.map((variation, variationIndex) =>
        variationIndex === index
          ? {
              ...variation,
              [field]: value,
            }
          : variation
      )
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const savedRevenue = await createContractRevenue({
        projectNumber: form.projectNumber,
        projectName: form.projectName,
        contractValue,
        startDate: form.startDate || null,
        completionDate: form.completionDate || null,
        budgetMaterial: toNumber(form.budgetMaterial),
        budgetMachining: toNumber(form.budgetMachining),
        budgetCoating: toNumber(form.budgetCoating),
        budgetConsumables: toNumber(form.budgetConsumables),
        budgetSubcontracts: toNumber(form.budgetSubcontracts),
        budgetProductionLabour: toNumber(form.budgetProductionLabour),
        budgetFreightCustom: toNumber(form.budgetFreightCustom),
        budgetInstallationLabour: toNumber(form.budgetInstallationLabour),
        budgetPrelims: toNumber(form.budgetPrelims),
        budgetFoh: toNumber(form.budgetFoh),
        budgetCommitments: toNumber(form.budgetCommitments),
        budgetContingencies: toNumber(form.budgetContingencies),
        variationBudgetMaterial: toNumber(form.variationBudgetMaterial),
        variationBudgetMachining: toNumber(form.variationBudgetMachining),
        variationBudgetCoating: toNumber(form.variationBudgetCoating),
        variationBudgetConsumables: toNumber(form.variationBudgetConsumables),
        variationBudgetSubcontracts: toNumber(form.variationBudgetSubcontracts),
        variationBudgetProductionLabour: toNumber(
          form.variationBudgetProductionLabour
        ),
        variationBudgetFreightCustom: toNumber(form.variationBudgetFreightCustom),
        variationBudgetInstallationLabour: toNumber(
          form.variationBudgetInstallationLabour
        ),
        variationBudgetPrelims: toNumber(form.variationBudgetPrelims),
        variationBudgetFoh: toNumber(form.variationBudgetFoh),
        variationBudgetCommitments: toNumber(form.variationBudgetCommitments),
        variationBudgetContingencies: toNumber(form.variationBudgetContingencies),
        variations: variations.map((variation, index) => ({
          variationNumber: variation.variationNumber || `VO# ${index + 1}`,
          amount: toNumber(variation.amount),
        })),
      })

      setRevenues((prev) => [savedRevenue, ...prev])
      setForm(initialForm)
      setVariations([])
      setMessage('Contract revenue saved.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save contract revenue.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Contract Revenue</h1>
        <p className="mt-2 text-slate-700">
          Save contract value, contract dates, budget split, and agreed
          variations for each project.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {budgetMessage && (
          <p className="mt-3 text-sm text-slate-600">{budgetMessage}</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProjectSelectFields
            projectNumber={form.projectNumber}
            projectName={form.projectName}
            onChange={handleProjectChange}
          />

          <Field label="Contract Ref">
            <input
              value={selectedProjectOption?.contract_po_ref || ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="Will show after project is selected"
            />
          </Field>

          <Field label="Contract Value">
            <input
              type="number"
              name="contractValue"
              value={form.contractValue}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              min="0"
              step="0.01"
              required
            />
          </Field>

          <Field label="Start Date">
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Completion Date">
            <input
              type="date"
              name="completionDate"
              value={form.completionDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Budget For</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {budgetFields.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  type="number"
                  name={field.key}
                  value={form[field.key]}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  min="0"
                  step="0.01"
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleAddVariation}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add Variation
          </button>

          {variations.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[45vh] w-full max-w-full overflow-auto">
                <table className="min-w-[520px] divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Variation #</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variations.map((variation, index) => (
                      <tr key={`${variation.variationNumber}-${index}`}>
                        <td className="px-4 py-3">
                          <input
                            value={variation.variationNumber}
                            onChange={(e) =>
                              handleVariationChange(
                                index,
                                'variationNumber',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={variation.amount}
                            onChange={(e) =>
                              handleVariationChange(
                                index,
                                'amount',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            min="0"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Variation Budget</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {variationBudgetFields.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  type="number"
                  name={field.key}
                  value={form[field.key]}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                  min="0"
                  step="0.01"
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Summary - Contract Value
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryValue label="Contract Value" value={contractValue} />
            <SummaryValue label="Agreed Variation" value={agreedVariation} />
            <SummaryValue label="Revised Contract" value={revisedContract} />
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Revenue'}
          </button>
          {message && <p className="text-sm text-green-700">{message}</p>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Saved Revenue Entries
          </h2>
        </div>
        <div className="max-h-[60vh] w-full max-w-full overflow-auto">
          <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Project #</th>
                <th className="px-4 py-3 font-semibold">Project Name</th>
                <th className="px-4 py-3 font-semibold">Contract Ref</th>
                <th className="px-4 py-3 font-semibold">Contract Value</th>
                <th className="px-4 py-3 font-semibold">Agreed Variation</th>
                <th className="px-4 py-3 font-semibold">Revised Contract</th>
                <th className="px-4 py-3 font-semibold">Start Date</th>
                <th className="px-4 py-3 font-semibold">Completion Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenues.map((revenue) => {
                const variationTotal = revenue.variations.reduce(
                  (total, variation) => total + variation.amount,
                  0
                )
                const revenueProjectOption =
                  projectOptions.find(
                    (project) =>
                      project.project_number === revenue.projectNumber ||
                      project.project_name === revenue.projectName
                  ) || null

                return (
                  <tr key={revenue.id}>
                    <td className="px-4 py-3 text-slate-900">
                      {revenue.projectNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {revenue.projectName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {revenueProjectOption?.contract_po_ref || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(revenue.contractValue)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(variationTotal)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(revenue.contractValue + variationTotal)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(revenue.startDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(revenue.completionDate)}
                    </td>
                  </tr>
                )
              })}

              {revenues.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
                    No contract revenue entries saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
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

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(value)}</p>
    </div>
  )
}

function formatDate(value: string | null) {
  return value || '-'
}

function getRevenueBudgetForProject(
  value: {
    projectNumber: string
    projectName: string
    tenderNumber?: string
    revisionNumber?: string
  },
  projects: ProjectOption[],
  boqItems: BoqItem[],
  costings: TenderCosting[],
  masterItems: MasterListItem[]
) {
  const project = projects.find(
    (item) =>
      item.project_number === value.projectNumber ||
      item.project_name === value.projectName
  )
  const tenderNumber = value.tenderNumber || project?.tender_number || ''
  const projectRevisionNumber =
    value.revisionNumber || project?.revision_number || ''

  if (!tenderNumber) {
    return {
      values: {},
      message: 'No tender is linked to this project yet.',
    }
  }

  const tenderRows = boqItems.filter(
    (item) => item.tenderNumber === tenderNumber
  )

  if (tenderRows.length === 0) {
    return {
      values: {},
      message: `No BOQ rows found for tender ${tenderNumber}.`,
    }
  }

  const latestRevision = projectRevisionNumber || getLatestRevision(tenderRows)
  const rows = tenderRows.filter(
    (item) => (item.revisionNumber || '') === latestRevision
  )
  const totals = createEmptyRevenueBudgetTotals()
  let costedRowCount = 0

  rows.forEach((row) => {
    const costing = costings.find(
      (item) => String(item.boqItemId) === String(row.id)
    )

    if (!costing) return

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
    const quantity = toNumber(row.quantity)

    totals.contractValue += summary.sellingAmount
    totals.budgetMaterial += summary.materialUnitCost * quantity
    totals.budgetMachining += summary.machiningUnitCost * quantity
    totals.budgetCoating += summary.coatingUnitCost * quantity
    totals.budgetConsumables += summary.consumableUnitCost * quantity
    totals.budgetSubcontracts += summary.subcontractUnitCost * quantity
    totals.budgetProductionLabour += summary.productionLabourUnitCost * quantity
    totals.budgetInstallationLabour += summary.installationLabourUnitCost * quantity
    totals.budgetFreightCustom +=
      summary.baseUnitCost * (toNumber(row.freightCustomDutyPercent) / 100) * quantity
    totals.budgetPrelims +=
      summary.baseUnitCost * (toNumber(row.prelimsPercent) / 100) * quantity
    totals.budgetFoh +=
      summary.baseUnitCost * (toNumber(row.fohPercent) / 100) * quantity
    totals.budgetCommitments +=
      summary.baseUnitCost * (toNumber(row.commitmentsPercent) / 100) * quantity
    totals.budgetContingencies +=
      summary.baseUnitCost * (toNumber(row.contingenciesPercent) / 100) * quantity
  })

  let message = `Loaded values from BOQ tender ${tenderNumber}${
    latestRevision ? ` revision ${latestRevision}` : ''
  }.`

  if (costedRowCount === 0) {
    message = `No costing details are saved for BOQ tender ${tenderNumber}${
      latestRevision ? ` revision ${latestRevision}` : ''
    }.`
  } else if (totals.contractValue === 0) {
    message = `BOQ loaded, but Selling Amount total is 0.00. Check that costing details and Markup are saved for tender ${tenderNumber}${
      latestRevision ? ` revision ${latestRevision}` : ''
    }.`
  }

  return {
    values: formatRevenueBudgetTotals(totals),
    message,
  }
}

function createEmptyRevenueBudgetTotals() {
  return {
    contractValue: 0,
    budgetMaterial: 0,
    budgetMachining: 0,
    budgetCoating: 0,
    budgetConsumables: 0,
    budgetSubcontracts: 0,
    budgetProductionLabour: 0,
    budgetFreightCustom: 0,
    budgetInstallationLabour: 0,
    budgetPrelims: 0,
    budgetFoh: 0,
    budgetCommitments: 0,
    budgetContingencies: 0,
  }
}

function formatRevenueBudgetTotals(
  totals: ReturnType<typeof createEmptyRevenueBudgetTotals>
) {
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, formatFormMoney(value)])
  ) as Partial<RevenueForm>
}

function getLatestRevision(rows: BoqItem[]) {
  return [...new Set(rows.map((row) => row.revisionNumber || ''))].sort(
    compareRevisionNumbers
  )[0]
}

function compareRevisionNumbers(a: string, b: string) {
  const aNumber = Number(a.match(/\d+/g)?.at(-1) || -1)
  const bNumber = Number(b.match(/\d+/g)?.at(-1) || -1)

  if (aNumber !== bNumber) return bNumber - aNumber
  return b.localeCompare(a)
}

function formatFormMoney(value: number) {
  return toNumber(value).toFixed(2)
}

function toNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}
