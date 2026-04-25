'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchAPI } from '@/lib/api'
import {
  getPackageOptions,
  getVariationOptions,
  type ProductionItemSelection,
  type ProductionProjectOption,
  updateProjectItemSelection,
} from '@/lib/production-selection'

type SummaryStage = {
  key: string
  label: string
  quantity: string
}

type SummaryResponse = {
  project_number: string
  project_name: string
  variation_number: string
  package: string
  total_quantity: string
  unit: string
  stages: SummaryStage[]
}

type BreakdownPeriod = {
  period_key: string
  period_label: string
  quantity: string
  designation_hours: Record<string, string>
}

type BreakdownResponse = {
  stage: string
  basis: 'daily' | 'weekly' | 'monthly'
  total_quantity: string
  unit: string
  designations: string[]
  hours_basis: string
  periods: BreakdownPeriod[]
}

type FilterState = ProductionItemSelection

type StageDetailFilterState = {
  dateFrom: string
  dateTo: string
  basis: 'daily' | 'weekly' | 'monthly'
}

const initialFilters: FilterState = {
  projectNumber: '',
  variationNumber: '',
  projectName: '',
  package: '',
  itemName: '',
  boqSn: '',
}

const initialStageFilters: StageDetailFilterState = {
  dateFrom: '',
  dateTo: '',
  basis: 'daily',
}

const detailBarColors = [
  '#0f172a',
  '#1d4ed8',
  '#0891b2',
  '#0f766e',
  '#16a34a',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#9333ea',
  '#475569',
]

export default function ProductionStatusViewClient() {
  const [projectOptions, setProjectOptions] = useState<ProductionProjectOption[]>([])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownResponse | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [stageFilters, setStageFilters] =
    useState<StageDetailFilterState>(initialStageFilters)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchAPI('/production/project-details/options/')
        setProjectOptions(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load project options.'
        )
      }
    }

    void loadProjects()
  }, [])

  const variationOptions = getVariationOptions(filters, projectOptions)
  const packageOptions = getPackageOptions(filters, projectOptions)

  const summaryChartData = useMemo(
    () =>
      (summary?.stages || []).map((stage) => ({
        ...stage,
        quantityValue: Number(stage.quantity),
      })),
    [summary]
  )

  const breakdownChartData = useMemo(
    () =>
      (breakdown?.periods || []).map((period) => ({
        periodLabel: period.period_label,
        quantity: Number(period.quantity),
        ...Object.fromEntries(
          (breakdown?.designations || []).map((designation) => [
            designation,
            Number(period.designation_hours[designation] || 0),
          ])
        ),
      })),
    [breakdown]
  )

  function handleSelectionChange(
    field: keyof ProductionItemSelection,
    value: string
  ) {
    setFilters((prev) =>
      updateProjectItemSelection(prev, field, value, projectOptions)
    )
    setSummary(null)
    setBreakdown(null)
    setSelectedStage('')
    setError('')
  }

  async function handleLoadSummary() {
    setLoadingSummary(true)
    setError('')
    setSummary(null)
    setBreakdown(null)
    setSelectedStage('')

    try {
      const params = new URLSearchParams({
        project_number: filters.projectNumber,
        project_name: filters.projectName,
        package: filters.package,
      })

      if (filters.variationNumber) {
        params.set('variation_number', filters.variationNumber)
      }

      const data = await fetchAPI(`/production/status/view/summary/?${params.toString()}`)
      setSummary(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load production status.'
      )
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleLoadBreakdown(stageKey: string) {
    setSelectedStage(stageKey)
    setLoadingBreakdown(true)
    setError('')

    try {
      const params = new URLSearchParams({
        project_number: filters.projectNumber,
        project_name: filters.projectName,
        package: filters.package,
        stage: stageKey,
        basis: stageFilters.basis,
      })

      if (filters.variationNumber) {
        params.set('variation_number', filters.variationNumber)
      }

      if (stageFilters.dateFrom) {
        params.set('date_from', stageFilters.dateFrom)
      }

      if (stageFilters.dateTo) {
        params.set('date_to', stageFilters.dateTo)
      }

      const data = await fetchAPI(
        `/production/status/view/breakdown/?${params.toString()}`
      )
      setBreakdown(data)
      setSelectedStage(stageKey)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load stage breakdown.'
      )
    } finally {
      setLoadingBreakdown(false)
    }
  }

  const selectedStageLabel =
    summary?.stages.find((stage) => stage.key === selectedStage)?.label || ''

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Production Status View</h1>
        <p className="mt-2 text-slate-700">
          Review stage progress against total quantity, then drill into one stage
          by daily, weekly, or monthly periods.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Project #">
            <select
              value={filters.projectNumber}
              onChange={(e) => handleSelectionChange('projectNumber', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select project #</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.project_number}>
                  {project.project_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Variation #">
            <select
              value={filters.variationNumber}
              onChange={(e) =>
                handleSelectionChange('variationNumber', e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!filters.projectNumber && !filters.projectName}
            >
              <option value="">Base Project</option>
              {variationOptions.map((variation) => (
                <option key={variation.id} value={variation.variation_number}>
                  {variation.variation_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Project Name">
            <select
              value={filters.projectName}
              onChange={(e) => handleSelectionChange('projectName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select project name</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.project_name}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Package">
            <select
              value={filters.package}
              onChange={(e) => handleSelectionChange('package', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={
                !filters.projectNumber ||
                !filters.projectName ||
                Boolean(filters.variationNumber)
              }
            >
              <option value="">
                {filters.variationNumber ? 'Variation status' : 'Select package'}
              </option>
              {packageOptions.map((packageValue) => (
                <option key={packageValue} value={packageValue}>
                  {packageValue}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleLoadSummary}
            disabled={
              loadingSummary ||
              !filters.projectNumber ||
              !filters.projectName ||
              (!filters.variationNumber && !filters.package)
            }
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loadingSummary ? 'Loading...' : 'Show Status'}
          </button>
        </div>
      </div>

      {summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Stage Progress
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {summary.project_number} | {summary.project_name}
                {summary.variation_number ? ` | ${summary.variation_number}` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Package: {summary.package || '-'} | Total Quantity: {summary.total_quantity}{' '}
                {summary.unit}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Click any bar below to open the stage trend view.
            </p>
          </div>

          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summaryChartData}
                margin={{ top: 12, right: 12, left: 0, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="label" stroke="#334155" />
                <YAxis
                  stroke="#334155"
                  domain={[0, Math.max(Number(summary.total_quantity), 1)]}
                />
                <Tooltip />
                <Bar
                  dataKey="quantityValue"
                  radius={[10, 10, 0, 0]}
                  onClick={(data) => {
                    if (data?.payload?.key) {
                      void handleLoadBreakdown(data.payload.key)
                    }
                  }}
                >
                  {summaryChartData.map((stage) => (
                    <Cell
                      key={stage.key}
                      fill={stage.key === selectedStage ? '#0f172a' : '#2563eb'}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {summary && selectedStage ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedStageLabel} Trend
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a date range and daily, weekly, or monthly basis for the
              selected stage.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              MH bars are allocated item-hours grouped by employee designation,
              based on saved time entry plus time allocation data.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Field label="From Date">
              <input
                type="date"
                value={stageFilters.dateFrom}
                onChange={(e) =>
                  setStageFilters((prev) => ({
                    ...prev,
                    dateFrom: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>

            <Field label="To Date">
              <input
                type="date"
                value={stageFilters.dateTo}
                onChange={(e) =>
                  setStageFilters((prev) => ({
                    ...prev,
                    dateTo: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>

            <Field label="Basis">
              <select
                value={stageFilters.basis}
                onChange={(e) =>
                  setStageFilters((prev) => ({
                    ...prev,
                    basis: e.target.value as StageDetailFilterState['basis'],
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleLoadBreakdown(selectedStage)}
                disabled={loadingBreakdown}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loadingBreakdown ? 'Loading...' : 'Show Trend'}
              </button>
            </div>
          </div>

          {breakdown ? (
            <div className="mt-8 space-y-4">
              <div className="text-sm text-slate-600">
                Total Quantity: {breakdown.total_quantity} {breakdown.unit}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <div
                  className="h-[460px]"
                  style={{
                    minWidth: `${Math.max(
                      breakdownChartData.length *
                        Math.max(120, (breakdown.designations.length + 1) * 56),
                      960
                    )}px`,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={breakdownChartData}
                      margin={{ top: 16, right: 24, left: 8, bottom: 40 }}
                      barGap={0}
                      barCategoryGap={28}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis
                        dataKey="periodLabel"
                        angle={-15}
                        textAnchor="end"
                        height={70}
                        stroke="#334155"
                      />
                      <YAxis stroke="#334155" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="quantity"
                        name={`${selectedStageLabel} Qty`}
                        fill={detailBarColors[0]}
                        radius={[6, 6, 0, 0]}
                      />
                      {breakdown.designations.map((designation, index) => (
                        <Bar
                          key={designation}
                          dataKey={designation}
                          name={`${designation} MH`}
                          fill={detailBarColors[(index + 1) % detailBarColors.length]}
                          radius={[6, 6, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
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
