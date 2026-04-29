'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { formatDateDdMmmYy } from '@/lib/date-format'
import { findNextDocumentNumber } from '@/lib/document-numbering'
import {
  BoqItem,
  ContractVariationLog,
  ContractRevenue,
  MasterListItem,
  TenderCosting,
  calculateCostSummary,
  createContractRevenue,
  formatMoney,
  getBoqItems,
  getContractRevenues,
  getContractVariationLogs,
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
  contractRef: string
  contractValue: string
  startDate: string
  completionDate: string
} & Record<BudgetKey | VariationBudgetKey, string>

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  tender_number: string
  revision_number: string
  contract_po_ref?: string
}

type VariationBudgetSection = {
  variationNumber: string
  values: Record<VariationBudgetKey, number>
}

type AgreedVariationSummaryRow = {
  rfvNumber: string
  approvedAmount: number
} & Record<VariationBudgetKey, number>

type SavedRevenueVariationRow = {
  revenueId: string | number
  projectNumber: string
  projectName: string
  contractRef: string
  contractValue: number
  startDate: string | null
  completionDate: string | null
  rfvNumber: string
  approvedAmount: number
} & Record<VariationBudgetKey, number>

const initialForm: RevenueForm = {
  projectNumber: '',
  projectName: '',
  contractRef: '',
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
  const [revenues, setRevenues] = useState<ContractRevenue[]>([])
  const [variationLogs, setVariationLogs] = useState<ContractVariationLog[]>([])
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [boqItems, setBoqItems] = useState<BoqItem[]>([])
  const [costings, setCostings] = useState<TenderCosting[]>([])
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [savedRfvFilter, setSavedRfvFilter] = useState('')
  const [budgetMessage, setBudgetMessage] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedRevenues,
          savedVariationLogs,
          savedProjects,
          savedBoqItems,
          savedCostings,
          savedMasterItems,
        ] = await Promise.all([
          getContractRevenues(),
          getContractVariationLogs(),
          fetchAPI('/production/project-details/options/'),
          getBoqItems(),
          getTenderCostings(),
          getMasterListItems(),
        ])

        setRevenues(savedRevenues)
        setVariationLogs(savedVariationLogs)
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

  const defaultProjectNumber = useMemo(
    () =>
      findNextDocumentNumber(
        [
          ...projectOptions.map((project) => project.project_number),
          ...revenues.map((revenue) => revenue.projectNumber),
        ],
        'PR'
      ),
    [projectOptions, revenues]
  )

  useEffect(() => {
    if (!form.projectNumber.trim() && defaultProjectNumber) {
      setForm((prev) => ({
        ...prev,
        projectNumber: defaultProjectNumber,
      }))
    }
  }, [defaultProjectNumber, form.projectNumber])

  const contractValue = toNumber(form.contractValue)
  const selectedProjectOption =
    projectOptions.find(
      (project) => project.project_name === form.projectName
    ) ||
    projectOptions.find((project) => project.project_number === form.projectNumber) ||
    null
  const variationBudgetSections = getVariationBudgetSectionsForProject(
    selectedProjectOption,
    boqItems,
    costings,
    masterItems
  )
  const agreedVariationRows = getAgreedVariationSummaryRows(
    selectedProjectOption,
    variationLogs,
    variationBudgetSections
  )
  const variationBudgetTotals = getVariationBudgetTotalsFromRows(
    agreedVariationRows
  )
  const agreedVariation = agreedVariationRows.reduce(
    (total, variation) => total + variation.approvedAmount,
    0
  )
  const hasManualProjectNumberFilter = Boolean(
    form.projectNumber.trim() && form.projectNumber !== defaultProjectNumber
  )
  const revisedContract = contractValue + agreedVariation
  const visibleRevenues = useMemo(
    () =>
      revenues.filter((revenue) => {
        if (form.projectName.trim()) {
          return (
            revenue.projectName === form.projectName ||
            revenue.projectNumber === form.projectNumber
          )
        }

        if (hasManualProjectNumberFilter) {
          return revenue.projectNumber === form.projectNumber
        }

        return true
      }),
    [
      form.projectName,
      form.projectNumber,
      hasManualProjectNumberFilter,
      revenues,
    ]
  )
  const savedRevenueRowsBase = useMemo(
    () => getSavedRevenueVariationRows(visibleRevenues),
    [visibleRevenues]
  )
  const savedRfvOptions = useMemo(
    () =>
      Array.from(
        new Set(
          savedRevenueRowsBase.map((row) => row.rfvNumber).filter(Boolean)
        )
      ),
    [savedRevenueRowsBase]
  )
  const savedRevenueRows = useMemo(
    () =>
      savedRevenueRowsBase.filter((row) =>
        savedRfvFilter ? row.rfvNumber === savedRfvFilter : true
      ),
    [savedRevenueRowsBase, savedRfvFilter]
  )

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function applyProjectSelection(value: {
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
    setSavedRfvFilter('')
    setBudgetMessage(budget?.message || '')
  }

  function handleProjectNumberChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const nextProjectNumber = e.target.value
    const matchedProject = projectOptions.find(
      (project) => project.project_number === nextProjectNumber
    )

    if (matchedProject) {
      applyProjectSelection({
        projectNumber: nextProjectNumber,
        projectName: matchedProject.project_name,
        tenderNumber: matchedProject.tender_number,
        revisionNumber: matchedProject.revision_number,
      })
      return
    }

    setForm((prev) => ({
      ...prev,
      projectNumber: nextProjectNumber,
    }))
    setSavedRfvFilter('')
  }

  function handleProjectNameChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextProjectName = e.target.value
    const matchedProject = projectOptions.find(
      (project) => project.project_name === nextProjectName
    )

    applyProjectSelection({
      projectNumber: form.projectNumber || matchedProject?.project_number || '',
      projectName: nextProjectName,
      tenderNumber: matchedProject?.tender_number,
      revisionNumber: matchedProject?.revision_number,
    })
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
        contractRef: form.contractRef.trim(),
        contractValue: roundMoney(contractValue),
        startDate: form.startDate || null,
        completionDate: form.completionDate || null,
        budgetMaterial: roundMoney(toNumber(form.budgetMaterial)),
        budgetMachining: roundMoney(toNumber(form.budgetMachining)),
        budgetCoating: roundMoney(toNumber(form.budgetCoating)),
        budgetConsumables: roundMoney(toNumber(form.budgetConsumables)),
        budgetSubcontracts: roundMoney(toNumber(form.budgetSubcontracts)),
        budgetProductionLabour: roundMoney(
          toNumber(form.budgetProductionLabour)
        ),
        budgetFreightCustom: roundMoney(toNumber(form.budgetFreightCustom)),
        budgetInstallationLabour: roundMoney(
          toNumber(form.budgetInstallationLabour)
        ),
        budgetPrelims: roundMoney(toNumber(form.budgetPrelims)),
        budgetFoh: roundMoney(toNumber(form.budgetFoh)),
        budgetCommitments: roundMoney(toNumber(form.budgetCommitments)),
        budgetContingencies: roundMoney(toNumber(form.budgetContingencies)),
        agreedVariationTotal: roundMoney(agreedVariation),
        variationBudgetMaterial: roundMoney(
          variationBudgetTotals.variationBudgetMaterial
        ),
        variationBudgetMachining: roundMoney(
          variationBudgetTotals.variationBudgetMachining
        ),
        variationBudgetCoating: roundMoney(
          variationBudgetTotals.variationBudgetCoating
        ),
        variationBudgetConsumables: roundMoney(
          variationBudgetTotals.variationBudgetConsumables
        ),
        variationBudgetSubcontracts: roundMoney(
          variationBudgetTotals.variationBudgetSubcontracts
        ),
        variationBudgetProductionLabour: roundMoney(
          variationBudgetTotals.variationBudgetProductionLabour
        ),
        variationBudgetFreightCustom: roundMoney(
          variationBudgetTotals.variationBudgetFreightCustom
        ),
        variationBudgetInstallationLabour: roundMoney(
          variationBudgetTotals.variationBudgetInstallationLabour
        ),
        variationBudgetPrelims: roundMoney(
          variationBudgetTotals.variationBudgetPrelims
        ),
        variationBudgetFoh: roundMoney(variationBudgetTotals.variationBudgetFoh),
        variationBudgetCommitments: roundMoney(
          variationBudgetTotals.variationBudgetCommitments
        ),
        variationBudgetContingencies: roundMoney(
          variationBudgetTotals.variationBudgetContingencies
        ),
        variations: agreedVariationRows.map((variation, index) => ({
          variationNumber: variation.rfvNumber || `RFV# ${index + 1}`,
          amount: roundMoney(variation.approvedAmount),
          material: roundMoney(variation.variationBudgetMaterial),
          machining: roundMoney(variation.variationBudgetMachining),
          coating: roundMoney(variation.variationBudgetCoating),
          consumables: roundMoney(variation.variationBudgetConsumables),
          subcontracts: roundMoney(variation.variationBudgetSubcontracts),
          productionLabour: roundMoney(
            variation.variationBudgetProductionLabour
          ),
          freightCustom: roundMoney(variation.variationBudgetFreightCustom),
          installationLabour: roundMoney(
            variation.variationBudgetInstallationLabour
          ),
          prelims: roundMoney(variation.variationBudgetPrelims),
          foh: roundMoney(variation.variationBudgetFoh),
          commitments: roundMoney(variation.variationBudgetCommitments),
          contingencies: roundMoney(variation.variationBudgetContingencies),
        })),
      })

      setRevenues((prev) => [savedRevenue, ...prev])
      setMessage('Contract revenue and budget saved.')
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
        <h1 className="text-2xl font-bold text-slate-900">Contract Revenue and Budget</h1>
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
          <Field label="Project #">
            <input
              name="projectNumber"
              value={form.projectNumber}
              onChange={handleProjectNumberChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder={defaultProjectNumber}
              required
            />
          </Field>

          <Field label="Project Name">
            <select
              name="projectName"
              value={form.projectName}
              onChange={handleProjectNameChange}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                form.projectName ? 'text-black' : 'text-neutral-400'
              }`}
              required
            >
              <option value="">Select project</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.project_name}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contract Ref">
            <input
              name="contractRef"
              value={form.contractRef}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter contract ref"
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
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                form.startDate ? 'text-black' : 'text-neutral-400'
              }`}
            />
          </Field>

          <Field label="Completion Date">
            <input
              type="date"
              name="completionDate"
              value={form.completionDate}
              onChange={handleChange}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                form.completionDate ? 'text-black' : 'text-neutral-400'
              }`}
            />
          </Field>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Contract Budget
          </h2>
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
          <h2 className="text-lg font-semibold text-slate-900">
            Agreed Variation - Revenue and Budget
          </h2>
          {agreedVariationRows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[45vh] w-full max-w-full overflow-auto">
                <table className="min-w-[1800px] divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">RFV #</th>
                      <th className="px-4 py-3 font-semibold">Approved Amount</th>
                      {variationBudgetFields.map((field) => (
                        <th key={field.key} className="px-4 py-3 font-semibold">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agreedVariationRows.map((variation) => (
                      <tr key={variation.rfvNumber}>
                        <td className="px-4 py-3 text-slate-900">
                          {variation.rfvNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatMoney(variation.approvedAmount)}
                        </td>
                        {variationBudgetFields.map((field) => (
                          <td key={field.key} className="px-4 py-3 text-slate-700">
                            {formatMoney(variation[field.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-slate-900">Total</td>
                      <td className="px-4 py-3 text-slate-900">
                        {formatMoney(agreedVariation)}
                      </td>
                      {variationBudgetFields.map((field) => (
                        <td key={field.key} className="px-4 py-3 text-slate-900">
                          {formatMoney(variationBudgetTotals[field.key])}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No approved variation details are available yet for this project.
            </p>
          )}
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
          <div className="mt-4 max-w-xs">
            <Field label="RFV #">
              <select
                value={savedRfvFilter}
                onChange={(e) => setSavedRfvFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="">All RFV #</option>
                {savedRfvOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="max-h-[60vh] w-full max-w-full overflow-auto">
          <table className="min-w-[2400px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Project #</th>
                <th className="px-4 py-3 font-semibold">Project Name</th>
                <th className="px-4 py-3 font-semibold">Contract Ref</th>
                <th className="px-4 py-3 font-semibold">Contract Value</th>
                <th className="px-4 py-3 font-semibold">Start Date</th>
                <th className="px-4 py-3 font-semibold">Completion Date</th>
                <th className="px-4 py-3 font-semibold">RFV #</th>
                <th className="px-4 py-3 font-semibold">Approved Amount</th>
                {variationBudgetFields.map((field) => (
                  <th key={field.key} className="px-4 py-3 font-semibold">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {savedRevenueRows.map((row, index) => (
                <tr key={`${row.revenueId}-${row.rfvNumber || 'base'}-${index}`}>
                  <td className="px-4 py-3 text-slate-900">{row.projectNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{row.projectName}</td>
                  <td className="px-4 py-3 text-slate-700">{row.contractRef || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.contractValue)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(row.startDate)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(row.completionDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.rfvNumber || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.approvedAmount)}
                  </td>
                  {variationBudgetFields.map((field) => (
                    <td key={field.key} className="px-4 py-3 text-slate-700">
                      {formatMoney(row[field.key])}
                    </td>
                  ))}
                </tr>
              ))}

              {savedRevenueRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={20}>
                    No contract revenue entries found for the current selection.
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
  return formatDateDdMmmYy(value)
}

function getAgreedVariationSummaryRows(
  project: ProjectOption | null,
  logs: ContractVariationLog[],
  sections: VariationBudgetSection[]
) {
  if (!project) {
    return [] as AgreedVariationSummaryRow[]
  }

  const latestLogsByRfv = new Map<string, ContractVariationLog>()

  logs
    .filter(
      (log) =>
        log.projectNumber === project.project_number ||
        log.projectName === project.project_name
    )
    .forEach((log) => {
      const rfvNumber = String(log.rfvNumber || '').trim()

      if (!rfvNumber) return

      const current = latestLogsByRfv.get(rfvNumber)

      if (!current || Number(log.id) > Number(current.id)) {
        latestLogsByRfv.set(rfvNumber, log)
      }
    })

  const sectionMap = new Map(
    sections.map((section) => [section.variationNumber, section.values])
  )

  return Array.from(latestLogsByRfv.values())
    .map((log) => {
      const variationNumber =
        String(log.clientVariationNumber || '').trim() ||
        String(log.rfvNumber || '').trim()
      const sectionValues =
        sectionMap.get(variationNumber) || createEmptyVariationBudgetTotals()

      return {
        rfvNumber: String(log.rfvNumber || '').trim(),
        approvedAmount: toNumber(log.approvedAmount),
        ...sectionValues,
      }
    })
    .filter((row) => row.approvedAmount !== 0)
}

function getVariationBudgetSectionsForProject(
  project: ProjectOption | null,
  boqItems: BoqItem[],
  costings: TenderCosting[],
  masterItems: MasterListItem[]
) {
  if (!project?.tender_number) {
    return [] as VariationBudgetSection[]
  }

  const variationNumbers = Array.from(
    new Set(
      boqItems
        .filter(
          (item) =>
            item.tenderNumber === project.tender_number &&
            !!String(item.variationNumber || '').trim()
        )
        .map((item) => String(item.variationNumber || '').trim())
    )
  )

  return variationNumbers.map((variationNumber) => {
    const rows = boqItems.filter(
      (item) =>
        item.tenderNumber === project.tender_number &&
        String(item.variationNumber || '').trim() === variationNumber
    )
    const latestRevision =
      [...new Set(rows.map((row) => row.revisionNumber || ''))].sort(
        compareRevisionNumbers
      )[0] || ''
    const latestRows = rows.filter(
      (row) => (row.revisionNumber || '') === latestRevision
    )
    const totals = createEmptyVariationBudgetTotals()

    latestRows.forEach((row) => {
      const costing = costings.find(
        (item) => String(item.boqItemId) === String(row.id)
      )

      if (!costing) return

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

      totals.variationBudgetMaterial += summary.materialUnitCost * quantity
      totals.variationBudgetMachining += summary.machiningUnitCost * quantity
      totals.variationBudgetCoating += summary.coatingUnitCost * quantity
      totals.variationBudgetConsumables += summary.consumableUnitCost * quantity
      totals.variationBudgetSubcontracts += summary.subcontractUnitCost * quantity
      totals.variationBudgetProductionLabour +=
        summary.productionLabourUnitCost * quantity
      totals.variationBudgetFreightCustom +=
        summary.baseUnitCost *
        (toNumber(row.freightCustomDutyPercent) / 100) *
        quantity
      totals.variationBudgetInstallationLabour +=
        summary.installationLabourUnitCost * quantity
      totals.variationBudgetPrelims +=
        summary.baseUnitCost * (toNumber(row.prelimsPercent) / 100) * quantity
      totals.variationBudgetFoh +=
        summary.baseUnitCost * (toNumber(row.fohPercent) / 100) * quantity
      totals.variationBudgetCommitments +=
        summary.baseUnitCost *
        (toNumber(row.commitmentsPercent) / 100) *
        quantity
      totals.variationBudgetContingencies +=
        summary.baseUnitCost *
        (toNumber(row.contingenciesPercent) / 100) *
        quantity
    })

    return {
      variationNumber,
      values: totals,
    }
  })
}

function createEmptyVariationBudgetTotals(): Record<VariationBudgetKey, number> {
  return {
    variationBudgetMaterial: 0,
    variationBudgetMachining: 0,
    variationBudgetCoating: 0,
    variationBudgetConsumables: 0,
    variationBudgetSubcontracts: 0,
    variationBudgetProductionLabour: 0,
    variationBudgetFreightCustom: 0,
    variationBudgetInstallationLabour: 0,
    variationBudgetPrelims: 0,
    variationBudgetFoh: 0,
    variationBudgetCommitments: 0,
    variationBudgetContingencies: 0,
  }
}

function getVariationBudgetTotalsFromRows(rows: AgreedVariationSummaryRow[]) {
  return rows.reduce((totals, row) => {
    variationBudgetFields.forEach((field) => {
      totals[field.key] += row[field.key]
    })

    return totals
  }, createEmptyVariationBudgetTotals())
}

function getSavedRevenueVariationRows(revenues: ContractRevenue[]) {
  return revenues.flatMap((revenue) => {
    if ((revenue.variations || []).length === 0) {
      return [
        {
          revenueId: revenue.id,
          projectNumber: revenue.projectNumber,
          projectName: revenue.projectName,
          contractRef: revenue.contractRef,
          contractValue: revenue.contractValue,
          startDate: revenue.startDate,
          completionDate: revenue.completionDate,
          rfvNumber: '',
          approvedAmount: toNumber(revenue.agreedVariationTotal),
          variationBudgetMaterial: toNumber(revenue.variationBudgetMaterial),
          variationBudgetMachining: toNumber(revenue.variationBudgetMachining),
          variationBudgetCoating: toNumber(revenue.variationBudgetCoating),
          variationBudgetConsumables: toNumber(revenue.variationBudgetConsumables),
          variationBudgetSubcontracts: toNumber(revenue.variationBudgetSubcontracts),
          variationBudgetProductionLabour: toNumber(
            revenue.variationBudgetProductionLabour
          ),
          variationBudgetFreightCustom: toNumber(
            revenue.variationBudgetFreightCustom
          ),
          variationBudgetInstallationLabour: toNumber(
            revenue.variationBudgetInstallationLabour
          ),
          variationBudgetPrelims: toNumber(revenue.variationBudgetPrelims),
          variationBudgetFoh: toNumber(revenue.variationBudgetFoh),
          variationBudgetCommitments: toNumber(revenue.variationBudgetCommitments),
          variationBudgetContingencies: toNumber(
            revenue.variationBudgetContingencies
          ),
        },
      ] as SavedRevenueVariationRow[]
    }

    return revenue.variations.map((variation) => ({
      revenueId: revenue.id,
      projectNumber: revenue.projectNumber,
      projectName: revenue.projectName,
      contractRef: revenue.contractRef,
      contractValue: revenue.contractValue,
      startDate: revenue.startDate,
      completionDate: revenue.completionDate,
      rfvNumber: variation.variationNumber,
      approvedAmount: toNumber(variation.amount),
      variationBudgetMaterial: toNumber(variation.material),
      variationBudgetMachining: toNumber(variation.machining),
      variationBudgetCoating: toNumber(variation.coating),
      variationBudgetConsumables: toNumber(variation.consumables),
      variationBudgetSubcontracts: toNumber(variation.subcontracts),
      variationBudgetProductionLabour: toNumber(variation.productionLabour),
      variationBudgetFreightCustom: toNumber(variation.freightCustom),
      variationBudgetInstallationLabour: toNumber(variation.installationLabour),
      variationBudgetPrelims: toNumber(variation.prelims),
      variationBudgetFoh: toNumber(variation.foh),
      variationBudgetCommitments: toNumber(variation.commitments),
      variationBudgetContingencies: toNumber(variation.contingencies),
    }))
  })
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
  const project =
    projects.find((item) => item.project_name === value.projectName) ||
    projects.find((item) => item.project_number === value.projectNumber)
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
    (item) => item.tenderNumber === tenderNumber && !item.variationNumber
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

function roundMoney(value: number) {
  return Number(toNumber(value).toFixed(2))
}

function toNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}
