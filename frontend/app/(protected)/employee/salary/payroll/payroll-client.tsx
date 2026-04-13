'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type PayrollResponse = {
  employee_id: string
  employee_name: string
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
const initialMonth = currentDate.getMonth() + 1
const initialYear = currentDate.getFullYear()

export default function PayrollClient() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('')
  const [month, setMonth] = useState(String(initialMonth))
  const [year, setYear] = useState(String(initialYear))
  const [otherDeduction, setOtherDeduction] = useState('0')
  const [advanceBalance, setAdvanceBalance] = useState('0')
  const [advanceDeduction, setAdvanceDeduction] = useState('0')
  const [payroll, setPayroll] = useState<PayrollResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      const data = await fetchAPI('/employees/salary/payroll-preview/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          month: Number(month),
          year: Number(year),
          other_deduction: otherDeduction || '0',
          advance_deduction: advanceDeduction || '0',
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
        <p className="mt-2 text-slate-700">
          Select employee, month, and year to generate salary slip.
        </p>
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
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
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Salary Slip - {selectedMonthLabel} {payroll.year}
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <p className="text-slate-800">
              <span className="font-semibold">Employee Name:</span> {payroll.employee_name}
            </p>
            <p className="text-slate-800">
              <span className="font-semibold">Employee ID:</span> {payroll.employee_id}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Attendance
              </h3>
              <div className="space-y-2 text-slate-800">
                <p>Calendar days: {payroll.calendar_days}</p>
                <p>Absent: {payroll.absent_days}</p>
                <p>Medical leave with doc: {payroll.medical_leave_with_doc_days}</p>
                <p>Medical leave without doc: {payroll.medical_leave_without_doc_days}</p>
                <p>Annual Leave: {payroll.annual_leave_days}</p>
                <p>Total working days: {payroll.total_working_days}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Overtime Details
              </h3>
              <div className="space-y-2 text-slate-800">
                <p>Normal OT hours: {payroll.normal_ot_hours}</p>
                <p>Sunday OT hours: {payroll.sunday_ot_hours}</p>
                <p>Public Holiday OT hours: {payroll.public_holiday_ot_hours}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 max-h-[70vh] w-full max-w-full overflow-auto">
            <table className="min-w-[780px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 pr-4 font-semibold">Salary Description</th>
                  <th className="py-3 pr-4 font-semibold">Monthly Salary</th>
                  <th className="py-3 pr-4 font-semibold">Earned Salary</th>
                  <th className="py-3 pr-4 font-semibold">Deductions</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-800">Basic Salary</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.basic_salary_monthly)}</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.basic_salary_earned)}</td>
                  <td className="py-3 pr-4 text-slate-800">Advance Deduction: {formatMoney(payroll.advance_deduction)}
                  </td>
                </tr>

                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-800">Other Allowances</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.other_allowances_monthly)}</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.other_allowances_earned)}</td>
                  <td className="py-3 pr-4 text-slate-800">Other Deduction: {formatMoney(payroll.other_deduction)}</td>
                </tr>

                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-800">Normal OT</td>
                  <td className="py-3 pr-4 text-slate-800">-</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.normal_ot_amount)}</td>
                  <td className="py-3 pr-4 text-slate-800">-</td>
                </tr>

                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-800">Sunday OT</td>
                  <td className="py-3 pr-4 text-slate-800">-</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.sunday_ot_amount)}</td>
                  <td className="py-3 pr-4 text-slate-800">-</td>
                </tr>

                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-800">Public Holiday OT</td>
                  <td className="py-3 pr-4 text-slate-800">-</td>
                  <td className="py-3 pr-4 text-slate-800">{formatMoney(payroll.public_holiday_ot_amount)}</td>
                  <td className="py-3 pr-4 text-slate-800">-</td>
                </tr>

                <tr className="border-b border-slate-200 font-semibold">
                  <td className="py-3 pr-4 text-slate-900">Total</td>
                  <td className="py-3 pr-4 text-slate-900">-</td>
                  <td className="py-3 pr-4 text-slate-900">{formatMoney(payroll.total_earned)}</td>
                  <td className="py-3 pr-4 text-slate-900">{formatMoney(payroll.total_deductions)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-xl bg-slate-900 px-6 py-4 text-white">
            <p className="text-lg font-semibold">
              Net Pay: {formatMoney(payroll.net_pay)}
            </p>
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
  return Number(value).toFixed(2)
}
