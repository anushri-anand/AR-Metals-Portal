'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { formatIndianMoney } from '@/lib/number-format'

type SalarySummaryCategory = 'Staff' | 'Labour'
type CompanyName = 'ARM' | 'AKR'

type SalarySummaryRow = {
  sn: number
  employee_id: string
  employee_name: string
  basic: string
  allow: string
  total_working_days: string
  normal_ot_hours: string
  sunday_ot_hours: string
  public_holiday_ot_hours: string
  earned_basic: string
  earned_allow: string
  earned_ot_amount: string
  gross_salary: string
  incentive: string
  advance_deduction: string
  other_deduction: string
  salary_payable: string
}

type SalarySummaryTotals = Omit<SalarySummaryRow, 'sn' | 'employee_id' | 'employee_name'>

type SalarySummaryResponse = {
  company: CompanyName
  company_display_name: string
  month: number
  year: number
  category: SalarySummaryCategory
  rows: SalarySummaryRow[]
  totals: SalarySummaryTotals
}

const companyOptions: CompanyName[] = ['ARM', 'AKR']
const categoryOptions: SalarySummaryCategory[] = ['Labour', 'Staff']

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const currentDate = new Date()

export default function SalarySummaryClient() {
  const [company, setCompany] = useState<CompanyName | ''>('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState(String(currentDate.getFullYear()))
  const [category, setCategory] = useState<SalarySummaryCategory | ''>('')
  const [summary, setSummary] = useState<SalarySummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSummary() {
      if (!company || !month || !year || !category) {
        setSummary(null)
        return
      }

      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          company,
          month,
          year,
          category,
        })
        const data = (await fetchAPI(
          `/employees/salary/summary/?${params.toString()}`
        )) as SalarySummaryResponse
        setSummary(data)
      } catch (err) {
        setSummary(null)
        setError(
          err instanceof Error ? err.message : 'Failed to load salary summary.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [category, company, month, year])

  const selectedMonthLabel = useMemo(() => {
    const selected = monthOptions.find((option) => option.value === Number(month))
    return selected?.label || ''
  }, [month])

  const isLabour = summary?.category === 'Labour' || category === 'Labour'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Salary Summary</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Company">
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value as CompanyName | '')}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                company ? 'text-black' : 'text-neutral-400'
              }`}
            >
              <option value="">Select company</option>
              {companyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Month">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                month ? 'text-black' : 'text-neutral-500'
              }`}
            >
              <option value="">Select Month</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year">
            <input
              type="number"
              inputMode="numeric"
              data-skip-indian-format="true"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as SalarySummaryCategory | '')
              }
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                month ? 'text-black' : 'text-neutral-500'
              }`}
            >
              <option value="">Select category</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {loading ? (
          <p className="text-slate-700">Loading salary summary...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : !summary ? (
          <p className="text-slate-700">
            Select company, month, year, and category to view the summary.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">
                {summary.company_display_name}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-700">
                Salary Summary - {selectedMonthLabel} {summary.year} - {summary.category}
              </p>
            </div>

            {summary.rows.length === 0 ? (
              <p className="text-slate-700">
                No saved payroll records found for the selected filters.
              </p>
            ) : (
              <div className="max-h-[72vh] w-full overflow-auto">
                <table className="min-w-[1500px] border-collapse border border-slate-300">
                  <thead className="sticky top-0 z-10 bg-[#e8f0dd]">
                    <tr className="text-center text-sm font-semibold text-slate-900">
                      <th className="border border-slate-300 px-2 py-3">S NO</th>
                      <th className="border border-slate-300 px-2 py-3">EMP CODE</th>
                      <th className="border border-slate-300 px-2 py-3">NAME</th>
                      <th className="border border-slate-300 px-2 py-3">BASIC</th>
                      <th className="border border-slate-300 px-2 py-3">ALLOW</th>
                      <th className="border border-slate-300 px-2 py-3">TOTAL WORKING DAYS</th>
                      {isLabour && (
                        <>
                          <th className="border border-slate-300 px-2 py-3">NORMAL OT (HRS)</th>
                          <th className="border border-slate-300 px-2 py-3">SUNDAY OT (HRS)</th>
                          <th className="border border-slate-300 px-2 py-3">PUBLIC HOLIDAY OT (HRS)</th>
                        </>
                      )}
                      <th className="border border-slate-300 px-2 py-3">EARNED BASIC</th>
                      <th className="border border-slate-300 px-2 py-3">EARNED ALLOW</th>
                      {isLabour && (
                        <th className="border border-slate-300 px-2 py-3">EARNED OT AMOUNT</th>
                      )}
                      <th className="border border-slate-300 px-2 py-3">GROSS SALARY</th>
                      <th className="border border-slate-300 px-2 py-3">INCENTIVE</th>
                      <th className="border border-slate-300 px-2 py-3">ADVANCE DEDUCTION</th>
                      <th className="border border-slate-300 px-2 py-3">OTHER DEDUCTION</th>
                      <th className="border border-slate-300 px-2 py-3">SALARY PAYABLE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {summary.rows.map((row) => (
                      <tr key={`${row.employee_id}-${row.sn}`} className="text-sm text-slate-900">
                        <td className="border border-slate-300 px-2 py-2 text-center">{row.sn}</td>
                        <td className="border border-slate-300 px-2 py-2">{row.employee_id}</td>
                        <td className="border border-slate-300 px-2 py-2">{row.employee_name}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.basic)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.allow)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.total_working_days)}</td>
                        {isLabour && (
                          <>
                            <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.normal_ot_hours)}</td>
                            <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.sunday_ot_hours)}</td>
                            <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.public_holiday_ot_hours)}</td>
                          </>
                        )}
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.earned_basic)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.earned_allow)}</td>
                        {isLabour && (
                          <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.earned_ot_amount)}</td>
                        )}
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.gross_salary)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoneyOrDash(row.incentive)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoneyOrDash(row.advance_deduction)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoneyOrDash(row.other_deduction)}</td>
                        <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(row.salary_payable)}</td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot className="sticky bottom-0 bg-[#fff7d6] text-sm font-semibold text-slate-900">
                    <tr>
                      <td className="border border-slate-300 px-2 py-3 text-center" />
                      <td className="border border-slate-300 px-2 py-3" />
                      <td className="border border-slate-300 px-2 py-3">TOTAL</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.basic)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.allow)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.total_working_days)}</td>
                      {isLabour && (
                        <>
                          <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.normal_ot_hours)}</td>
                          <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.sunday_ot_hours)}</td>
                          <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.public_holiday_ot_hours)}</td>
                        </>
                      )}
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.earned_basic)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.earned_allow)}</td>
                      {isLabour && (
                        <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.earned_ot_amount)}</td>
                      )}
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.gross_salary)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoneyOrDash(summary.totals.incentive)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoneyOrDash(summary.totals.advance_deduction)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoneyOrDash(summary.totals.other_deduction)}</td>
                      <td className="border border-slate-300 px-2 py-3 text-right">{formatMoney(summary.totals.salary_payable)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
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

function formatMoney(value: string) {
  return formatIndianMoney(value)
}

function formatMoneyOrDash(value: string) {
  return Number(value) === 0 ? '-' : formatMoney(value)
}
