'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type EmployeeHistoryRow = {
  id: number
  employee_id: string
  employee_name: string
  category: 'Staff' | 'Labour'
  is_current: boolean
}


type FormState = {
  employeeId: string
  employeeName: string
  date: string
  isPublicHoliday: boolean
  startTime: string
  finishTime: string
  regularDutyHours: string
  medicalLeaveWithDoc: boolean
  medicalLeaveWithoutDoc: boolean
  absent: boolean
  remarks: string
}

const initialForm: FormState = {
  employeeId: '',
  employeeName: '',
  date: '',
  isPublicHoliday: false,
  startTime: '',
  finishTime: '',
  regularDutyHours: '9',
  medicalLeaveWithDoc: false,
  medicalLeaveWithoutDoc: false,
  absent: false,
  remarks: '',
}

const timeOptions = Array.from({ length: 96 }, (_, index) => {
    const hours = Math.floor(index / 4)
    const minutes = (index % 4) * 15
  
    const hourText = String(hours).padStart(2, '0')
    const minuteText = String(minutes).padStart(2, '0')
  
    return `${hourText}:${minuteText}`
  })
  
export default function TimeEntryForm() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [publicHolidayDates, setPublicHolidayDates] = useState<string[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [employeeCategory, setEmployeeCategory] = useState<'Staff' | 'Labour' | ''>('')

  useEffect(() => {
    async function loadEmployeeOptions() {
      try {
        const [employeeData, holidayData] = await Promise.all([
          fetchAPI('/employees/options/'),
          fetchAPI('/employees/time-sheet/public-holidays/'),
        ])
        setEmployeeOptions(employeeData)
        setPublicHolidayDates(Array.isArray(holidayData) ? holidayData : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load time entry options.'
        )
      }
    }

    loadEmployeeOptions()
  }, [])

  useEffect(() => {
    async function loadEmployeeCategory() {
      if (!form.employeeId) {
        setEmployeeCategory('')
        return
      }
  
      try {
        const data = await fetchAPI(
          `/employees/personal-details/history/?employee_id=${form.employeeId}`
        )
  
        const currentRow = data.find((row: EmployeeHistoryRow) => row.is_current)
        setEmployeeCategory(currentRow ? currentRow.category : '')
      } catch {
        setEmployeeCategory('')
      }
    }
  
    loadEmployeeCategory()
  }, [form.employeeId])

  useEffect(() => {
    if (!form.date) {
      return
    }

    if (!publicHolidayDates.includes(form.date) || form.isPublicHoliday) {
      return
    }

    setForm((prev) => ({
      ...prev,
      isPublicHoliday: true,
    }))
  }, [form.date, form.isPublicHoliday, publicHolidayDates])
  

  const day = useMemo(() => {
    if (!form.date) return ''
    return new Date(`${form.date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
    })
  }, [form.date])

  const isLeaveOrAbsent =
    form.medicalLeaveWithDoc || form.medicalLeaveWithoutDoc || form.absent

  const totalTime = useMemo(() => {
    if (isLeaveOrAbsent) return 0
    if (!form.startTime || !form.finishTime) return 0

    const startMinutes = timeToMinutes(form.startTime)
    const finishMinutes = timeToMinutes(form.finishTime)

    if (finishMinutes <= startMinutes) return 0

    return (finishMinutes - startMinutes) / 60
  }, [form.startTime, form.finishTime, isLeaveOrAbsent])

  const regularDutyHours = Number(form.regularDutyHours || 0)
  const extraHours = Math.max(totalTime - regularDutyHours, 0)

  const normalOT = useMemo(() => {
    if (employeeCategory !== 'Labour') return 0
    if (isLeaveOrAbsent) return 0
    if (form.isPublicHoliday) return 0
    if (day === 'Sunday') return 0
    return extraHours
  }, [day, extraHours, form.isPublicHoliday, isLeaveOrAbsent, employeeCategory])
  
  const sundayOT = useMemo(() => {
    if (employeeCategory !== 'Labour') return 0
    if (isLeaveOrAbsent) return 0
    if (form.isPublicHoliday) return 0
    if (day !== 'Sunday') return 0
    return extraHours
  }, [day, extraHours, form.isPublicHoliday, isLeaveOrAbsent, employeeCategory])
  
  const publicHolidayOT = useMemo(() => {
    if (employeeCategory !== 'Labour') return 0
    if (isLeaveOrAbsent) return 0
    if (!form.isPublicHoliday) return 0
    return totalTime > 6 ? Math.max(totalTime - 1, 0) : totalTime
  }, [employeeCategory, form.isPublicHoliday, isLeaveOrAbsent, totalTime])
  
  function handleEmployeeIdChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )

    setForm((prev) => ({
      ...prev,
      employeeId: value,
      employeeName: selectedEmployee ? selectedEmployee.employee_name : '',
    }))
  }

  function handleEmployeeNameChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )

    setForm((prev) => ({
      ...prev,
      employeeName: value,
      employeeId: selectedEmployee ? selectedEmployee.employee_id : '',
    }))
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleMedicalLeaveWithDocChange(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      medicalLeaveWithDoc: checked,
      medicalLeaveWithoutDoc: checked ? false : prev.medicalLeaveWithoutDoc,
      absent: checked ? false : prev.absent,
      startTime: checked ? '' : prev.startTime,
      finishTime: checked ? '' : prev.finishTime,
    }))
  }

  function handleMedicalLeaveWithoutDocChange(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      medicalLeaveWithoutDoc: checked,
      medicalLeaveWithDoc: checked ? false : prev.medicalLeaveWithDoc,
      absent: checked ? false : prev.absent,
      startTime: checked ? '' : prev.startTime,
      finishTime: checked ? '' : prev.finishTime,
    }))
  }

  function handleAbsentChange(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      absent: checked,
      medicalLeaveWithDoc: checked ? false : prev.medicalLeaveWithDoc,
      medicalLeaveWithoutDoc: checked ? false : prev.medicalLeaveWithoutDoc,
      startTime: checked ? '' : prev.startTime,
      finishTime: checked ? '' : prev.finishTime,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      await fetchAPI('/employees/time-sheet/time-entry/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: form.employeeId,
          date: form.date,
          is_public_holiday: form.isPublicHoliday,
          start_time: form.startTime || null,
          finish_time: form.finishTime || null,
          regular_duty_hours: form.regularDutyHours,
          medical_leave_with_doc: form.medicalLeaveWithDoc,
          medical_leave_without_doc: form.medicalLeaveWithoutDoc,
          absent: form.absent,
          remarks: form.remarks,
        }),
      })

      if (form.isPublicHoliday && form.date) {
        setPublicHolidayDates((prev) =>
          prev.includes(form.date) ? prev : [...prev, form.date]
        )
      }
      setForm(initialForm)
      setMessage('Time entry saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save time entry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Time Entry</h1>
        <p className="mt-2 text-slate-700">
          Enter daily attendance, duty hours, overtime, and leave information.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Employee ID">
            <select
              value={form.employeeId}
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
              value={form.employeeName}
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

          <Field label="Date">
            <div className="space-y-3">
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={(e) => {
                  const nextDate = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    date: nextDate,
                    isPublicHoliday: publicHolidayDates.includes(nextDate),
                  }))
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                required
              />

              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name="isPublicHoliday"
                  checked={form.isPublicHoliday}
                  onChange={handleChange}
                />
                Public Holiday
              </label>
            </div>
          </Field>

          <Field label="Day">
            <input
              value={day}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

            <Field label="Start Time">
                <select
                  name="startTime"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                    }))
                    }
                    disabled={isLeaveOrAbsent}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-50"
                >
                    <option value="">Select start time</option>
                    {timeOptions.map((time) => (
                        <option key={time} value={time}>
                            {time}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Finish Time">
                <select
                    name="finishTime"
                    value={form.finishTime}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            finishTime: e.target.value,
                        }))
                    }
                    disabled={isLeaveOrAbsent}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-50"
                >
                    <option value="">Select finish time</option>
                    {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                    ))}
                </select>
            </Field>


          <Field label="Total Time">
            <input
              value={formatHours(totalTime)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Regular Duty Hours">
            <input
              type="number"
              step="0.25"
              name="regularDutyHours"
              value={form.regularDutyHours}
              onChange={handleChange}
              disabled={isLeaveOrAbsent}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-50"
              required
            />
          </Field>

          {employeeCategory === 'Labour' && (
              <>
                <Field label="Normal OT">
                  <input
                    value={formatHours(normalOT)}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                  />
                </Field>

                <Field label="Sunday OT">
                  <input
                    value={formatHours(sundayOT)}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                  />
                </Field>

                <Field label="Public Holiday OT">
                  <input
                    value={formatHours(publicHolidayOT)}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                  />
                </Field>
              </>
            )}

            <Field label="Medical Leave">
                <div className="space-y-3 rounded-lg border border-slate-300 px-3 py-3">
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                        <input
                            type="checkbox"
                            checked={form.medicalLeaveWithDoc}
                            onChange={(e) => handleMedicalLeaveWithDocChange(e.target.checked)}
                        />
                        With doc
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-800">
                        <input
                            type="checkbox"
                            checked={form.medicalLeaveWithoutDoc}
                            onChange={(e) => handleMedicalLeaveWithoutDocChange(e.target.checked)}
                        />
                        Without doc
                    </label>
                </div>
            </Field>

          <Field label="Absent">
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={form.absent}
                onChange={(e) => handleAbsentChange(e.target.checked)}
              />
              Mark as absent
            </label>
          </Field>

          <div className="md:col-span-2">
            <Field label="Remarks">
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter remarks"
              />
            </Field>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>
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

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function formatHours(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
