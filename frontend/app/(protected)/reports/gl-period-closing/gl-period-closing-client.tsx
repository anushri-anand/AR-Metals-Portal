'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type PeriodRecord = {
  id: number
  month: number
  year: number
  status: 'submitted' | 'approved'
  submitted_by: string
  approved_by: string
  submitted_at: string
  approved_at: string | null
}

type MeResponse = {
  role: string
}

const quarterMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function GlPeriodClosingClient() {
  const currentYear = new Date().getFullYear()
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, index) => currentYear + index),
    [currentYear]
  )

  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(currentYear))
  const [periods, setPeriods] = useState<PeriodRecord[]>([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [periodData, me] = await Promise.all([
          fetchAPI('/procurement/gl-period-closing/'),
          fetchAPI('/accounts/me/'),
        ])

        setPeriods(Array.isArray(periodData) ? periodData : [])
        setRole((me as MeResponse)?.role || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load GL period closing data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const savedPeriod = await fetchAPI('/procurement/gl-period-closing/', {
        method: 'POST',
        body: JSON.stringify({
          month: Number(month),
          year: Number(year),
        }),
      })

      setPeriods((prev) => upsertPeriod(prev, savedPeriod))
      setMessage('GL period submitted for approval.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit GL period.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove(periodId: number) {
    setApprovingId(periodId)
    setError('')
    setMessage('')

    try {
      const approvedPeriod = await fetchAPI(
        `/procurement/gl-period-closing/${periodId}/approve/`,
        {
          method: 'POST',
        }
      )

      setPeriods((prev) => upsertPeriod(prev, approvedPeriod))
      setMessage('GL period approved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve GL period.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">GL Period Closing</h1>
        <p className="mt-2 text-slate-700">
          Submit a month and year for closing. Once approved, entries cannot use that
          month or any earlier date.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field label="Month">
            <select
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {quarterMonths.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Year">
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Actions">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Submitted Periods</h2>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Month</HeaderCell>
                <HeaderCell>Year</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Submitted By</HeaderCell>
                <HeaderCell>Submitted At</HeaderCell>
                <HeaderCell>Approved By</HeaderCell>
                <HeaderCell>Approved At</HeaderCell>
                <HeaderCell>Approval</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {periods.length > 0 ? (
                periods.map((period) => (
                  <tr key={period.id} className="border-b border-slate-200">
                    <BodyCell>{quarterMonths[period.month - 1] || period.month}</BodyCell>
                    <BodyCell>{period.year}</BodyCell>
                    <BodyCell className="capitalize">{period.status}</BodyCell>
                    <BodyCell>{period.submitted_by || '-'}</BodyCell>
                    <BodyCell>{formatDateTime(period.submitted_at)}</BodyCell>
                    <BodyCell>{period.approved_by || '-'}</BodyCell>
                    <BodyCell>{formatDateTime(period.approved_at)}</BodyCell>
                    <BodyCell>
                      {role === 'admin' && period.status !== 'approved' ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(period.id)}
                          disabled={approvingId === period.id}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {approvingId === period.id ? 'Approving...' : 'Approval'}
                        </button>
                      ) : (
                        '-'
                      )}
                    </BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={8}>
                    {loading ? 'Loading periods...' : 'No GL periods submitted yet.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function upsertPeriod(records: PeriodRecord[], nextRecord: PeriodRecord) {
  const remainingRecords = records.filter((record) => record.id !== nextRecord.id)
  return [nextRecord, ...remainingRecords].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year
    }

    if (left.month !== right.month) {
      return right.month - left.month
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

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      className={`border-r border-slate-200 px-4 py-3 align-top text-slate-700 ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}
