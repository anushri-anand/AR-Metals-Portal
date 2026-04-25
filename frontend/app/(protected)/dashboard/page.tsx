'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchAPI } from '@/lib/api'
import { companyOptions, type CompanyName } from '@/lib/company'

type ProjectOption = {
  project_number: string
  project_name: string
}

type EmployeeOption = {
  employee_id: string
  employee_name: string
  category?: 'Staff' | 'Labour' | ''
}

type TimeAllocationLine = {
  date: string
  employee_id: string
  employee_name: string
  project_number: string
  project_name: string
  percentage: string | number
}

type ProcurementPaymentPhase = {
  phase_number?: string | number
  amount: string | number
  due_date?: string | null
  forecast_date?: string | null
  invoice_date?: string | null
  gl_date?: string | null
}

type PurchaseOrderItem = {
  id?: number
  line_number: number
  item_description: string
  quantity?: string | number
  unit?: string
  rate?: string | number
  amount?: string | number
  depreciation_start_date?: string
  depreciation_end_date?: string
}

type ProcurementPaymentRecord = {
  po_number: string
  project_number: string
  project_name: string
  phases: ProcurementPaymentPhase[]
  delivery_items?: Array<{
    id: number
    line_number: number
    item_description: string
    unit: string
    rate: string | number
    received_quantity: string | number
    actual_incurred_cost?: string | number
  }>
}

type ProcurementDeliveryItem = NonNullable<ProcurementPaymentRecord['delivery_items']>[number]

type PurchaseOrderRecord = {
  id: number
  order_type: 'project' | 'asset' | 'inventory'
  po_number: string
  project_number: string
  project_name: string
  cost_code: string
  supplier_name?: string
  purchase_items?: PurchaseOrderItem[]
}

type InventoryIssuanceRecord = {
  po_number: string
  issuance_date: string
  project_name: string
  project_number: string
  quantity_issued: string | number
  amount: string | number
}

type PettyCashVoucher = {
  voucher_number: string
  items: Array<{
    item: string
    project_name: string
    project_number: string
    amount_exc_vat: string | number
    invoice_date: string | null
  }>
}

type AssociatedCostEntryRecord = {
  serial_number: string
  supplier_name: string
  cost_code: string
  items: Array<{
    line_number: number
    employee_id?: string | null
    employee_name?: string | null
    cost_code?: string
    item_description: string
    quantity: string | number
    rate: string | number
    amount: string | number
    start_date: string
    end_date: string
  }>
}

type AssociatedCostPaymentRecord = {
  serial_number: string
  entry_date?: string | null
  delivery_items?: Array<{
    line_number: number
    employee_id?: string | null
    invoice_date?: string | null
    gl_date?: string | null
    received_quantity: string | number
    rate: string | number
    actual_incurred_cost?: string | number
  }>
}

type AssociatedCostPaymentItem = NonNullable<AssociatedCostPaymentRecord['delivery_items']>[number]

type SalaryActualIncurredCostRow = {
  date: string
  project_name: string
  project_number: string
  amount: string | number
}

type CompanyDashboardData = {
  company: CompanyName
  projectOptions: ProjectOption[]
  timeAllocations: TimeAllocationLine[]
  approvedRows: DashboardRow[]
  costRows: DashboardRow[]
}

type DashboardRow = {
  date: string
  projectNumber: string
  projectName: string
  amount: number
}

type ChartRow = {
  monthKey: string
  monthLabel: string
  cumulativeApprovedAmount: number
  cumulativeMonthlyCost: number
}

type CostBookingSummary = {
  staff: number
  labour: number
}

export default function DashboardPage() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyName>('ARM')
  const [projectFilter, setProjectFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [companyData, setCompanyData] = useState<Record<CompanyName, CompanyDashboardData | null>>({
    ARM: null,
    AKR: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [employees, ...companies] = await Promise.all([
          fetchAPI('/employees/options/'),
          ...companyOptions.map((company) => loadCompanyDashboardData(company)),
        ])

        setEmployeeOptions(Array.isArray(employees) ? employees : [])
        setCompanyData({
          ARM: companies.find((item) => item.company === 'ARM') || null,
          AKR: companies.find((item) => item.company === 'AKR') || null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  const selectedCompanyData = companyData[selectedCompany]

  const projectOptions = useMemo(() => {
    return [...(selectedCompanyData?.projectOptions || [])].sort((left, right) =>
      `${left.project_number} ${left.project_name}`.localeCompare(
        `${right.project_number} ${right.project_name}`
      )
    )
  }, [selectedCompanyData])

  const availableYears = useMemo(() => {
    const years = new Set<number>()

    for (const row of [
      ...(selectedCompanyData?.approvedRows || []),
      ...(selectedCompanyData?.costRows || []),
    ]) {
      const parsed = parseISODate(row.date)
      if (parsed) {
        years.add(parsed.getUTCFullYear())
      }
    }

    return Array.from(years).sort((left, right) => right - left)
  }, [selectedCompanyData])

  const selectedProject = useMemo(
    () =>
      projectOptions.find(
        (project) => `${project.project_number}::${project.project_name}` === projectFilter
      ) || null,
    [projectFilter, projectOptions]
  )

  const employeeCategoryMap = useMemo(
    () =>
      new Map(
        employeeOptions.map((employee) => [employee.employee_id, employee.category || ''])
      ),
    [employeeOptions]
  )

  const selectedCompanyView = useMemo(() => {
    const filteredApprovedRows = filterRowsByProjectAndYear(
      selectedCompanyData?.approvedRows || [],
      selectedProject,
      yearFilter
    )
    const filteredCostRows = filterRowsByProjectAndYear(
      selectedCompanyData?.costRows || [],
      selectedProject,
      yearFilter
    )

    return {
      company: selectedCompany,
      chartRows: buildChartRows(filteredApprovedRows, filteredCostRows, yearFilter),
    }
  }, [selectedCompany, selectedCompanyData, selectedProject, yearFilter])

  const costBookingViews = useMemo(() => {
    return companyOptions.map((company) => ({
      company,
      costBooking: buildCostBookingSummary(
        companyData[company]?.timeAllocations || [],
        employeeCategoryMap,
        null,
        ''
      ),
    }))
  }, [companyData, employeeCategoryMap])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-700">
          Review cumulative approved amount, cumulative monthly cost, and cost booking for ARM and
          AKR.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <button
            type="button"
            onClick={() => {
              setSelectedCompany('ARM')
              setProjectFilter('')
              setYearFilter('')
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Company</span>
            <select
              value={selectedCompany}
              onChange={(event) => {
                setSelectedCompany(event.target.value as CompanyName)
                setProjectFilter('')
                setYearFilter('')
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500"
            >
              {companyOptions.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Project</span>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500"
            >
              <option value="">All Projects</option>
              {projectOptions.map((project) => (
                <option
                  key={`${project.project_number}::${project.project_name}`}
                  value={`${project.project_number}::${project.project_name}`}
                >
                  {project.project_number} | {project.project_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Year</span>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500"
            >
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900">Revenue Vs Cost Analysis</h2>
          <p className="mt-1 text-sm text-slate-600">
            {selectedCompany} cumulative approved amount vs cumulative monthly cost
          </p>
        </div>

        <div className="h-[360px] p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-700">
              Loading chart...
            </div>
          ) : selectedCompanyView.chartRows.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={selectedCompanyView.chartRows}
                margin={{ top: 16, right: 16, bottom: 16, left: 8 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" tick={{ fill: '#0f172a', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#0f172a', fontSize: 12 }}
                  tickFormatter={(value) => formatCompactAmount(Number(value))}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value || 0)),
                    name === 'cumulativeApprovedAmount'
                      ? 'Cumulative Approved Amount'
                      : 'Cumulative Monthly Cost',
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulativeApprovedAmount"
                  name="Cumulative Approved Amount"
                  stroke="#1d4ed8"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeMonthlyCost"
                  name="Cumulative Monthly Cost"
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-700">
              No chart data found for the selected filters.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Human Resources</h2>
        <p className="mt-2 text-sm text-slate-600">
          Distinct employees booked through time allocation, split by Staff and Labour.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {costBookingViews.map((view) => (
            <div key={view.company} className="rounded-2xl border border-slate-200 p-6">
              <div className="text-center text-lg font-semibold text-slate-900">{view.company}</div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <BookingCard label="Staff" value={view.costBooking.staff} />
                <BookingCard label="Labour" value={view.costBooking.labour} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BookingCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-5 text-3xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  )
}

async function loadCompanyDashboardData(company: CompanyName): Promise<CompanyDashboardData> {
  const [
    projectOptions,
    procurementPayments,
    projectPurchaseOrders,
    assetPurchaseOrders,
    inventoryIssuances,
    pettyCashVouchers,
    associatedCostEntries,
    associatedCostPayments,
    salaryActualRows,
    timeAllocations,
  ] = await Promise.all([
    fetchCompanyAPI('/production/project-details/options/', company),
    fetchCompanyAPI('/procurement/payment/', company),
    fetchCompanyAPI('/procurement/purchase-order/?order_type=project', company),
    fetchCompanyAPI('/procurement/purchase-order/?order_type=asset', company),
    fetchCompanyAPI('/procurement/inventory-issuance/', company),
    fetchCompanyAPI('/procurement/petty-cash/', company),
    fetchCompanyAPI('/employees/associated-cost/', company),
    fetchCompanyAPI('/employees/associated-cost/payment/', company),
    fetchCompanyAPI('/employees/salary/actual-incurred-cost/', company),
    fetchCompanyAPI('/production/time-allocation/', company).catch(() => []),
  ])

  const typedProjectOptions = ensureArray<ProjectOption>(projectOptions)
  const typedProcurementPayments = ensureArray<ProcurementPaymentRecord>(procurementPayments)
  const typedProjectPurchaseOrders = ensureArray<PurchaseOrderRecord>(projectPurchaseOrders)
  const typedAssetPurchaseOrders = ensureArray<PurchaseOrderRecord>(assetPurchaseOrders)
  const typedInventoryIssuances = ensureArray<InventoryIssuanceRecord>(inventoryIssuances)
  const typedPettyCashVouchers = ensureArray<PettyCashVoucher>(pettyCashVouchers)
  const typedAssociatedCostEntries = ensureArray<AssociatedCostEntryRecord>(associatedCostEntries)
  const typedAssociatedCostPayments = ensureArray<AssociatedCostPaymentRecord>(associatedCostPayments)
  const typedSalaryActualRows = ensureArray<SalaryActualIncurredCostRow>(salaryActualRows)
  const typedTimeAllocations = ensureArray<TimeAllocationLine>(timeAllocations)

  const projectOrderMap = new Map<string, PurchaseOrderRecord>()
  for (const order of typedProjectPurchaseOrders) {
    if (order.po_number) {
      projectOrderMap.set(String(order.po_number), order)
    }
  }

  const approvedRows = [
    ...buildProcurementApprovedRows(typedProcurementPayments),
    ...buildAssociatedCostApprovedRows(typedAssociatedCostPayments, typedTimeAllocations),
  ]

  const costRows = [
    ...buildProjectActualCostRows(typedProcurementPayments, projectOrderMap),
    ...buildAssetActualCostRows(typedAssetPurchaseOrders),
    ...buildInventoryActualCostRows(typedInventoryIssuances),
    ...buildPettyCashActualCostRows(typedPettyCashVouchers),
    ...buildAssociatedCostActualRows(typedAssociatedCostEntries, typedTimeAllocations),
    ...buildSalaryActualCostRows(typedSalaryActualRows),
  ]

  return {
    company,
    projectOptions: typedProjectOptions.map((project) => ({
      project_number: String(project.project_number || ''),
      project_name: String(project.project_name || ''),
    })),
    timeAllocations: typedTimeAllocations.map((line) => ({
      date: String(line.date || ''),
      employee_id: String(line.employee_id || ''),
      employee_name: String(line.employee_name || ''),
      project_number: String(line.project_number || ''),
      project_name: String(line.project_name || ''),
      percentage: line.percentage || 0,
    })),
    approvedRows,
    costRows,
  }
}

function buildProcurementApprovedRows(records: ProcurementPaymentRecord[]) {
  return records.flatMap((record) =>
    ensureArray<ProcurementPaymentPhase>(record.phases)
      .map((phase) => ({
        date:
          String(phase.invoice_date || phase.gl_date || phase.forecast_date || phase.due_date || ''),
        projectNumber: String(record.project_number || ''),
        projectName: String(record.project_name || ''),
        amount: toNumber(phase.amount),
      }))
      .filter((row) => row.date && row.amount > 0)
  )
}

function buildAssociatedCostApprovedRows(
  payments: AssociatedCostPaymentRecord[],
  timeAllocations: TimeAllocationLine[]
) {
  return payments.flatMap((payment) =>
    ensureArray<AssociatedCostPaymentItem>(payment.delivery_items).flatMap(
      (item) => {
      const amount = toNumber(item.actual_incurred_cost) || toNumber(item.received_quantity) * toNumber(item.rate)
      const date = String(item.invoice_date || item.gl_date || payment.entry_date || '')

      if (!date || amount <= 0) {
        return []
      }

      const dateMonthKey = getMonthKey(date)
      const matchingAllocations = timeAllocations.filter(
        (line) => line.employee_id === String(item.employee_id || '') && getMonthKey(line.date) === dateMonthKey
      )

      const grouped = groupAllocationPercentages(matchingAllocations)
      const totalPercentage = Array.from(grouped.values()).reduce(
        (sum, group) => sum + group.totalPercentage,
        0
      )

      if (totalPercentage <= 0) {
        return [
          {
            date,
            projectNumber: '',
            projectName: 'Unallocated',
            amount,
          },
        ]
      }

      return Array.from(grouped.values()).map((group) => ({
        date,
        projectNumber: group.projectNumber,
        projectName: group.projectName,
        amount: amount * (group.totalPercentage / totalPercentage),
      }))
      }
    )
  )
}

function buildProjectActualCostRows(
  paymentEntries: ProcurementPaymentRecord[],
  orderMap: Map<string, PurchaseOrderRecord>
) {
  return paymentEntries.flatMap((entry) => {
    const purchaseOrder = orderMap.get(String(entry.po_number || ''))
    if (!purchaseOrder) {
      return []
    }

    const invoiceDate =
      ensureArray<ProcurementPaymentPhase>(entry.phases)
        .sort((left, right) => Number(left.phase_number || 0) - Number(right.phase_number || 0))
        .find((phase) => phase.invoice_date)?.invoice_date || ''

    return ensureArray<ProcurementDeliveryItem>(entry.delivery_items)
      .map((item) => {
        const purchaseItem = ensureArray<PurchaseOrderItem>(purchaseOrder.purchase_items).find(
          (purchaseOrderItem) => Number(purchaseOrderItem.line_number) === Number(item.line_number)
        )
        const quantity = toNumber(item.received_quantity)
        const rate = toNumber(purchaseItem?.rate) || toNumber(item.rate)
        return {
          date: String(invoiceDate || ''),
          projectNumber: String(entry.project_number || purchaseOrder.project_number || ''),
          projectName: String(entry.project_name || purchaseOrder.project_name || ''),
          amount: quantity * rate,
        }
      })
      .filter((row) => row.date && row.amount > 0)
  })
}

function buildAssetActualCostRows(purchaseOrders: PurchaseOrderRecord[]) {
  return purchaseOrders.flatMap((order) =>
    ensureArray<PurchaseOrderItem>(order.purchase_items).flatMap((item) => {
      const startDate = parseISODate(String(item.depreciation_start_date || ''))
      const endDate = parseISODate(String(item.depreciation_end_date || ''))

      if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
        return []
      }

      const totalDays = getInclusiveDayCount(startDate, endDate)
      if (totalDays <= 0) {
        return []
      }

      const totalAmount = toNumber(item.amount) || toNumber(item.quantity) * toNumber(item.rate)
      const dailyRate = totalAmount / totalDays

      return buildMonthlySegments(startDate, endDate).map((segment) => ({
        date: segment.date,
        projectNumber: String(order.project_number || ''),
        projectName: String(order.project_name || ''),
        amount: segment.days * dailyRate,
      }))
    })
  )
}

function buildInventoryActualCostRows(issuances: InventoryIssuanceRecord[]) {
  return issuances
    .map((issuance) => ({
      date: String(issuance.issuance_date || ''),
      projectNumber: String(issuance.project_number || ''),
      projectName: String(issuance.project_name || ''),
      amount: toNumber(issuance.amount),
    }))
    .filter((row) => row.date && row.amount > 0)
}

function buildPettyCashActualCostRows(vouchers: PettyCashVoucher[]) {
  return vouchers.flatMap((voucher) =>
    ensureArray<PettyCashVoucher['items'][number]>(voucher.items)
      .map((item) => ({
        date: String(item.invoice_date || ''),
        projectNumber: String(item.project_number || ''),
        projectName: String(item.project_name || ''),
        amount: toNumber(item.amount_exc_vat),
      }))
      .filter((row) => row.date && row.amount > 0)
  )
}

function buildAssociatedCostActualRows(
  entries: AssociatedCostEntryRecord[],
  timeAllocations: TimeAllocationLine[]
) {
  return entries.flatMap((entry) =>
    ensureArray<AssociatedCostEntryRecord['items'][number]>(entry.items).flatMap((item) => {
      const startDate = parseISODate(String(item.start_date || ''))
      const endDate = parseISODate(String(item.end_date || ''))

      if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
        return []
      }

      const totalDays = getInclusiveDayCount(startDate, endDate)
      if (totalDays <= 0) {
        return []
      }

      const totalAmount = toNumber(item.amount) || toNumber(item.quantity) * toNumber(item.rate)
      const dailyRate = totalAmount / totalDays

      return buildMonthlySegments(startDate, endDate).flatMap((segment) => {
        const matchingAllocations = timeAllocations.filter(
          (line) =>
            line.employee_id === String(item.employee_id || '') &&
            line.date >= segment.startDate &&
            line.date <= segment.endDate
        )

        const grouped = groupAllocationPercentages(matchingAllocations)
        const totalPercentage = Array.from(grouped.values()).reduce(
          (sum, group) => sum + group.totalPercentage,
          0
        )
        const segmentAmount = segment.days * dailyRate

        if (totalPercentage <= 0) {
          return [
            {
              date: segment.date,
              projectNumber: '',
              projectName: 'Unallocated',
              amount: segmentAmount,
            },
          ]
        }

        return Array.from(grouped.values()).map((group) => ({
          date: segment.date,
          projectNumber: group.projectNumber,
          projectName: group.projectName,
          amount: segmentAmount * (group.totalPercentage / totalPercentage),
        }))
      })
    })
  )
}

function buildSalaryActualCostRows(rows: SalaryActualIncurredCostRow[]) {
  return rows
    .map((row) => ({
      date: String(row.date || ''),
      projectNumber: String(row.project_number || ''),
      projectName: String(row.project_name || ''),
      amount: toNumber(row.amount),
    }))
    .filter((row) => row.date && row.amount > 0)
}

function buildCostBookingSummary(
  timeAllocations: TimeAllocationLine[],
  employeeCategoryMap: Map<string, string>,
  selectedProject: ProjectOption | null,
  selectedYear: string
): CostBookingSummary {
  const filtered = timeAllocations.filter((line) => {
    if (selectedProject) {
      const matchesProjectNumber = line.project_number === selectedProject.project_number
      const matchesProjectName = line.project_name === selectedProject.project_name
      if (!matchesProjectNumber && !matchesProjectName) {
        return false
      }
    }

    if (selectedYear) {
      const parsed = parseISODate(line.date)
      if (!parsed || String(parsed.getUTCFullYear()) !== selectedYear) {
        return false
      }
    }

    return true
  })

  const staff = new Set<string>()
  const labour = new Set<string>()

  for (const line of filtered) {
    const category = employeeCategoryMap.get(line.employee_id) || ''
    if (category === 'Staff') {
      staff.add(line.employee_id)
    } else if (category === 'Labour') {
      labour.add(line.employee_id)
    }
  }

  return {
    staff: staff.size,
    labour: labour.size,
  }
}

function buildChartRows(
  approvedRows: DashboardRow[],
  costRows: DashboardRow[],
  selectedYear: string
): ChartRow[] {
  const filteredApprovedRows = approvedRows.filter((row) => row.date)
  const filteredCostRows = costRows.filter((row) => row.date)
  const allRows = [...filteredApprovedRows, ...filteredCostRows]
  const endDate = new Date()

  let monthKeys: string[] = []

  if (selectedYear) {
    monthKeys = Array.from({ length: 12 }, (_, index) => `${selectedYear}-${String(index + 1).padStart(2, '0')}`)
  } else if (allRows.length > 0) {
    const sortedDates = allRows
      .map((row) => parseISODate(row.date))
      .filter((value): value is Date => Boolean(value))
      .sort((left, right) => compareDates(left, right))

    const startDate = sortedDates[0]
    monthKeys = buildMonthRange(getMonthStart(startDate), getMonthStart(endDate))
  } else {
    monthKeys = [getMonthKey(formatToday())]
  }

  const approvedByMonth = aggregateByMonth(filteredApprovedRows)
  const costByMonth = aggregateByMonth(filteredCostRows)

  let cumulativeApprovedAmount = 0
  let cumulativeMonthlyCost = 0

  return monthKeys.map((monthKey) => {
    cumulativeApprovedAmount += approvedByMonth.get(monthKey) || 0
    cumulativeMonthlyCost += costByMonth.get(monthKey) || 0

    return {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      cumulativeApprovedAmount: Number(cumulativeApprovedAmount.toFixed(2)),
      cumulativeMonthlyCost: Number(cumulativeMonthlyCost.toFixed(2)),
    }
  })
}

function aggregateByMonth(rows: DashboardRow[]) {
  const monthMap = new Map<string, number>()

  for (const row of rows) {
    const monthKey = getMonthKey(row.date)
    if (!monthKey) {
      continue
    }

    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + row.amount)
  }

  return monthMap
}

function filterRowsByProjectAndYear(
  rows: DashboardRow[],
  selectedProject: ProjectOption | null,
  selectedYear: string
) {
  return rows.filter((row) => {
    if (selectedProject) {
      const matchesProjectNumber = row.projectNumber === selectedProject.project_number
      const matchesProjectName = row.projectName === selectedProject.project_name

      if (!matchesProjectNumber && !matchesProjectName) {
        return false
      }
    }

    if (selectedYear) {
      const parsed = parseISODate(row.date)
      if (!parsed || String(parsed.getUTCFullYear()) !== selectedYear) {
        return false
      }
    }

    return true
  })
}

function groupAllocationPercentages(timeAllocationLines: TimeAllocationLine[]) {
  const grouped = new Map<
    string,
    { projectNumber: string; projectName: string; totalPercentage: number }
  >()

  for (const allocation of timeAllocationLines) {
    const key = `${allocation.project_number}::${allocation.project_name}`
    const existing = grouped.get(key)
    const percentage = toNumber(allocation.percentage)

    if (existing) {
      existing.totalPercentage += percentage
    } else {
      grouped.set(key, {
        projectNumber: allocation.project_number || '',
        projectName: allocation.project_name || '',
        totalPercentage: percentage,
      })
    }
  }

  return grouped
}

async function fetchCompanyAPI(path: string, company: CompanyName) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const headers = new Headers({ 'Content-Type': 'application/json', 'X-Company': company })

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers,
    cache: 'no-store',
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type')
    const errorData =
      contentType && contentType.includes('application/json') ? await response.json() : null
    throw new Error(extractErrorMessage(errorData) || `API request failed: ${response.status}`)
  }

  return response.json()
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

  try {
    const configuredUrl = new URL(baseUrl)
    const currentHost = window.location.hostname
    const isLocalBackendHost =
      configuredUrl.hostname === 'localhost' || configuredUrl.hostname === '127.0.0.1'
    const isLocalFrontendHost = currentHost === 'localhost' || currentHost === '127.0.0.1'

    if (isLocalBackendHost && !isLocalFrontendHost) {
      configuredUrl.hostname = currentHost
    }

    return configuredUrl.toString().replace(/\/$/, '')
  } catch {
    return baseUrl.replace(/\/$/, '')
  }
}

function extractErrorMessage(value: unknown): string {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(extractErrorMessage).filter(Boolean).join(' ')
  }

  if (typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      const nestedMessage = extractErrorMessage(nestedValue)
      if (nestedMessage) {
        return nestedMessage
      }
    }
  }

  return ''
}

function ensureArray<T>(value: unknown) {
  return (Array.isArray(value) ? value : []) as T[]
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseISODate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (!match) {
    return null
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function compareDates(left: Date, right: Date) {
  return left.getTime() - right.getTime()
}

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1
}

function getMonthEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function formatISODate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildMonthlySegments(startDate: Date, endDate: Date) {
  const segments: Array<{ startDate: string; endDate: string; date: string; days: number }> = []
  let currentStart = startDate

  while (compareDates(currentStart, endDate) <= 0) {
    const monthEnd = getMonthEnd(currentStart)
    const segmentEnd = compareDates(monthEnd, endDate) < 0 ? monthEnd : endDate

    segments.push({
      startDate: formatISODate(currentStart),
      endDate: formatISODate(segmentEnd),
      date: formatISODate(segmentEnd),
      days: getInclusiveDayCount(currentStart, segmentEnd),
    })

    currentStart = addDays(segmentEnd, 1)
  }

  return segments
}

function getMonthKey(value: string) {
  const parsed = parseISODate(value)
  if (!parsed) {
    return ''
  }

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`
}

function buildMonthRange(startMonth: Date, endMonth: Date) {
  const months: string[] = []
  let cursor = getMonthStart(startMonth)

  while (compareDates(cursor, endMonth) <= 0) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)
    cursor = addMonths(cursor, 1)
  }

  return months
}

function formatMonthLabel(monthKey: string) {
  const parsed = parseISODate(`${monthKey}-01`)
  if (!parsed) {
    return monthKey
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatCompactAmount(value: number) {
  return value.toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
}

function formatToday() {
  return formatISODate(new Date())
}
