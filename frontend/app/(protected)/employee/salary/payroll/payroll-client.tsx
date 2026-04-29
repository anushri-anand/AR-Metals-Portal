'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type PayrollResponse = {
  company_code: 'ARM' | 'AKR'
  company_display_name: string
  employee_id: string
  employee_name: string
  category: 'Staff' | 'Labour'
  month: number
  year: number
  calendar_days: number
  absent_days: number
  medical_leave_with_doc_days: number
  medical_leave_without_doc_days: number
  annual_leave_days: number
  total_working_days: number
  normal_ot_hours: string
  sunday_ot_hours: string
  public_holiday_ot_hours: string
  basic_salary_monthly: string
  basic_salary_earned: string
  other_allowances_monthly: string
  other_allowances_earned: string
  normal_ot_amount: string
  sunday_ot_amount: string
  public_holiday_ot_amount: string
  total_ot_amount: string
  leave_salary_amount: string
  gratuity_amount: string
  incentive: string
  advance_balance: string
  advance_deduction: string
  other_deduction: string
  total_earned: string
  total_deductions: string
  net_pay: string
}

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
const initialYear = currentDate.getFullYear()

export default function PayrollClient() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState(String(initialYear))
  const [otherDeduction, setOtherDeduction] = useState('0')
  const [incentive, setIncentive] = useState('0')
  const [advanceBalance, setAdvanceBalance] = useState('0')
  const [advanceDeduction, setAdvanceDeduction] = useState('0')
  const [payroll, setPayroll] = useState<PayrollResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [assetOrigin, setAssetOrigin] = useState('')

  useEffect(() => {
    async function loadEmployeeOptions() {
      try {
        const data = await fetchAPI('/employees/options/')
        setEmployeeOptions(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load employee options.'
        )
      }
    }

    loadEmployeeOptions()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAssetOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    async function loadAdvanceBalance() {
      if (!selectedEmployeeId || !month || !year) {
        setAdvanceBalance('0')
        return
      }
  
      try {
        const data = await fetchAPI('/employees/salary/payroll-preview/', {
          method: 'POST',
          body: JSON.stringify({
            employee_id: selectedEmployeeId,
            month: Number(month),
            year: Number(year),
            advance_deduction: '0',
            other_deduction: '0',
            incentive: '0',
          }),
        })
  
        setAdvanceBalance(data.advance_balance)
      } catch {
        setAdvanceBalance('0')
      }
    }
  
    loadAdvanceBalance()
  }, [selectedEmployeeId, month, year])
  

  const selectedMonthLabel = useMemo(() => {
    const foundMonth = monthOptions.find((item) => item.value === Number(month))
    return foundMonth ? foundMonth.label : ''
  }, [month])

  function handleEmployeeIdChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )

    setSelectedEmployeeId(value)
    setSelectedEmployeeName(selectedEmployee ? selectedEmployee.employee_name : '')
    setPayroll(null)
  }

  function handleEmployeeNameChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )

    setSelectedEmployeeName(value)
    setSelectedEmployeeId(selectedEmployee ? selectedEmployee.employee_id : '')
    setPayroll(null)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPayroll(null)

    try {
      const data = await fetchAPI('/employees/salary/payroll/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          month: Number(month),
          year: Number(year),
          other_deduction: otherDeduction || '0',
          advance_deduction: advanceDeduction || '0',
          incentive: incentive || '0',
        }),
      })

      setPayroll(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate payroll preview.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
      </div>

      <form
        onSubmit={handleGenerate}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Employee ID">
            <select
              value={selectedEmployeeId}
              onChange={(e) => handleEmployeeIdChange(e.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                selectedEmployeeId ? 'text-black' : 'text-neutral-500'
              }`}
              required
            >
              <option value="">Select employee ID</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_id}>
                  {employee.employee_id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employee Name">
            <select
              value={selectedEmployeeName}
              onChange={(e) => handleEmployeeNameChange(e.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                selectedEmployeeName ? 'text-black' : 'text-neutral-500'
              }`}
              required
            >
              <option value="">Select employee name</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_name}>
                  {employee.employee_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Month">
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value)
                setPayroll(null)
              }}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                month ? 'text-black' : 'text-neutral-500'
              }`}
              required
            >
              <option value="">Select Month</option>
              {monthOptions.map((monthOption) => (
                <option key={monthOption.value} value={monthOption.value}>
                  {monthOption.label}
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
              onChange={(e) => {
                setYear(e.target.value)
                setPayroll(null)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Advance Balance">
            <input
              value={formatMoney(advanceBalance)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Advance Deduction">
            <input
              type="number"
              step="0.01"
              value={advanceDeduction}
              onChange={(e) => {
                setAdvanceDeduction(e.target.value)
                setPayroll(null)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Other Deduction">
            <input
              type="number"
              step="0.01"
              value={otherDeduction}
              onChange={(e) => {
                setOtherDeduction(e.target.value)
                setPayroll(null)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Incentive">
            <input
              type="number"
              step="0.01"
              value={incentive}
              onChange={(e) => {
                setIncentive(e.target.value)
                setPayroll(null)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Generating...' : 'Generate Payroll'}
          </button>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>

      {payroll && (
        <div
          data-export-scope="true"
          data-export-kind="payroll-slip"
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div
            className="mx-auto max-w-[860px] overflow-x-auto text-black"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            <div className="min-w-[760px] border border-black bg-white">
              <div className="border-b border-black px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCompanyLogoSrc(payroll.company_code, assetOrigin)}
                    alt={
                      payroll.company_code === 'AKR'
                        ? 'Al Kanz Al Raq Metal Coating Industrial LLC'
                        : 'Al Riyada Metal Industrial LLC'
                    }
                    className="payroll-logo h-16 w-auto"
                  />
              </div>

              <table className="payroll-header-table w-full border-collapse text-[15px]">
                <colgroup>
                  <col style={{ width: '26%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th
                      colSpan={4}
                      className="payroll-title-cell border-b border-black px-3 py-1 text-center text-[20px] font-bold"
                    >
                      Salary Slip - {selectedMonthLabel} {payroll.year}
                    </th>
                  </tr>
                  <tr>
                    <th className="payroll-meta-label border-r border-b border-black px-2 py-1 text-left font-bold">
                      Employee Name:
                    </th>
                    <td className="payroll-meta-value border-r border-b border-black px-2 py-1 text-left font-bold">
                      {payroll.employee_name}
                    </td>
                    <td
                      colSpan={2}
                      className="payroll-meta-spacer border-b border-black px-2 py-1"
                    >
                      &nbsp;
                    </td>
                  </tr>
                  <tr>
                    <th className="payroll-meta-label border-r border-b border-black px-2 py-1 text-left font-bold">
                      Employee ID:
                    </th>
                    <td className="payroll-meta-value border-r border-b border-black px-2 py-1 text-left font-bold">
                      {payroll.employee_id}
                    </td>
                    <td
                      colSpan={2}
                      className="payroll-meta-spacer border-b border-black px-2 py-1"
                    >
                      &nbsp;
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="payroll-attendance-table w-full border-collapse text-[15px]">
                <tbody>
                  <tr>
                    <th
                      colSpan={2}
                      className="payroll-section-heading border-r border-b border-black px-2 py-1 text-center text-[18px] font-bold"
                    >
                      Attendance
                    </th>
                    <th
                      colSpan={2}
                      className="payroll-section-heading border-b border-black px-2 py-1 text-center text-[18px] font-bold"
                    >
                      Overtime Details
                    </th>
                  </tr>
                  <AttendanceRow
                    leftLabel="Calendar days:"
                    leftValue={String(payroll.calendar_days)}
                    rightLabel="Normal OT hours:"
                    rightValue={formatHours(payroll.normal_ot_hours)}
                  />
                  <AttendanceRow
                    leftLabel="Absent:"
                    leftValue={String(payroll.absent_days)}
                    rightLabel="Sunday OT hours:"
                    rightValue={formatHours(payroll.sunday_ot_hours)}
                  />
                  <AttendanceRow
                    leftLabel="Medical leave with doc:"
                    leftValue={String(payroll.medical_leave_with_doc_days)}
                    rightLabel="Public Holiday OT hours:"
                    rightValue={formatHours(payroll.public_holiday_ot_hours)}
                  />
                  <AttendanceRow
                    leftLabel="Medical leave without doc:"
                    leftValue={String(payroll.medical_leave_without_doc_days)}
                    rightLabel=""
                    rightValue=""
                  />
                  <AttendanceRow
                    leftLabel="Annual Leave:"
                    leftValue={String(payroll.annual_leave_days)}
                    rightLabel=""
                    rightValue=""
                  />
                  <AttendanceRow
                    leftLabel="Total working days:"
                    leftValue={String(payroll.total_working_days)}
                    rightLabel=""
                    rightValue=""
                    isLast
                  />
                </tbody>
              </table>

              <table className="payroll-salary-table w-full border-collapse text-[15px]">
                <thead>
                  <tr>
                    <th className="payroll-column-heading border-r border-b border-black px-2 py-1 text-center font-bold">
                      Salary Description
                    </th>
                    <th className="payroll-column-heading border-r border-b border-black px-2 py-1 text-center font-bold">
                      Monthly Salary
                    </th>
                    <th className="payroll-column-heading border-r border-b border-black px-2 py-1 text-center font-bold">
                      Earned Salary
                    </th>
                    <th className="payroll-column-heading border-r border-b border-black px-2 py-1 text-center font-bold">
                      Deductions
                    </th>
                    <th className="payroll-column-heading border-b border-black px-2 py-1 text-center font-bold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <SalaryRow
                    description="Basic Salary"
                    monthly={formatMoney(payroll.basic_salary_monthly)}
                    earned={formatMoney(payroll.basic_salary_earned)}
                    deductionLabel="Advance Deduction:"
                    deductionAmount={formatMoney(payroll.advance_deduction)}
                  />
                  <SalaryRow
                    description="Other Allowances"
                    monthly={formatMoney(payroll.other_allowances_monthly)}
                    earned={formatMoney(payroll.other_allowances_earned)}
                    deductionLabel="Other Deduction:"
                    deductionAmount={formatMoney(payroll.other_deduction)}
                  />
                  <SalaryRow
                    description="Normal OT"
                    monthly=""
                    earned={formatMoney(payroll.normal_ot_amount)}
                    deductionLabel=""
                    deductionAmount=""
                  />
                  <SalaryRow
                    description="Sunday OT"
                    monthly=""
                    earned={formatMoney(payroll.sunday_ot_amount)}
                    deductionLabel=""
                    deductionAmount=""
                  />
                  <SalaryRow
                    description="Public Holiday OT"
                    monthly=""
                    earned={formatMoney(payroll.public_holiday_ot_amount)}
                    deductionLabel=""
                    deductionAmount=""
                  />
                  <SalaryRow
                    description="Incentive"
                    monthly=""
                    earned={formatMoney(payroll.incentive)}
                    deductionLabel=""
                    deductionAmount=""
                  />
                  <SalaryRow
                    description="Total"
                    monthly=""
                    earned={formatMoney(payroll.total_earned)}
                    deductionLabel="Total Deductions:"
                    deductionAmount={formatMoney(payroll.total_deductions)}
                    bold
                    isLast
                  />
                </tbody>
              </table>

              <table className="w-full border-collapse text-[17px]">
                <tbody>
                  <tr>
                    <th className="payroll-netpay border-b border-black px-2 py-2 text-center text-[18px] font-bold">
                      Net Pay: {formatMoney(payroll.net_pay)}
                    </th>
                  </tr>
                </tbody>
              </table>

              <table className="payroll-signature-table w-full border-collapse text-[16px]">
                <tbody>
                  <tr>
                    <th className="payroll-signature-cell w-1/2 px-4 py-16 text-left align-top font-bold">
                      Employee Signature:
                    </th>
                    <th className="payroll-signature-cell px-4 py-16 text-left align-top font-bold">
                      Authorized Signature:
                    </th>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getCompanyLogoSrc(companyCode: 'ARM' | 'AKR', origin: string) {
  const base = origin || ''

  return companyCode === 'AKR'
    ? `${base}/akr-logo.png`
    : `${base}/al-riyada-logo.jpeg`
}

function formatHours(value: string) {
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function AttendanceRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  isLast = false,
}: {
  leftLabel: string
  leftValue: string
  rightLabel: string
  rightValue: string
  isLast?: boolean
}) {
  const cellClass = isLast ? 'px-2 py-1' : 'border-b border-black px-2 py-1'
  const splitClass = isLast
    ? 'border-r border-black px-2 py-1'
    : 'border-r border-b border-black px-2 py-1'

  return (
    <tr>
      <td className={splitClass}>{leftLabel}</td>
      <td className={`${splitClass} text-right`}>{leftValue}</td>
      <td className={cellClass}>{rightLabel || '\u00A0'}</td>
      <td className={`${cellClass} text-right`}>{rightValue || '\u00A0'}</td>
    </tr>
  )
}

function SalaryRow({
  description,
  monthly,
  earned,
  deductionLabel,
  deductionAmount,
  bold = false,
  isLast = false,
}: {
  description: string
  monthly: string
  earned: string
  deductionLabel: string
  deductionAmount: string
  bold?: boolean
  isLast?: boolean
}) {
  const rowClass = `${isLast ? '' : 'border-b border-black '} ${
    bold ? 'font-bold' : ''
  }`

  return (
    <tr className={rowClass}>
      <td className="border-r border-black px-2 py-1">{description}</td>
      <td className="border-r border-black px-2 py-1 text-right">
        {monthly || '\u00A0'}
      </td>
      <td className="border-r border-black px-2 py-1 text-right">
        {earned || '\u00A0'}
      </td>
      <td className="border-r border-black px-2 py-1">
        {deductionLabel || '\u00A0'}
      </td>
      <td className="px-2 py-1 text-right">{deductionAmount || '\u00A0'}</td>
    </tr>
  )
}
