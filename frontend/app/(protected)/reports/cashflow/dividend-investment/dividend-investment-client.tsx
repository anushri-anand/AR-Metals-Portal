'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createDividendInvestmentEntry,
  getDividendInvestmentEntries,
  type DividendInvestmentEntry,
} from '@/lib/reports-storage'

type FormState = {
  date: string
  client: string
  paid: string
  received: string
}

const initialFormState = (): FormState => ({
  date: formatDateInputValue(new Date()),
  client: '',
  paid: '',
  received: '',
})

export default function DividendInvestmentClient() {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [entries, setEntries] = useState<DividendInvestmentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    async function loadEntries() {
      setLoading(true)
      setError('')

      try {
        const data = await getDividendInvestmentEntries()
        setEntries(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load dividend and investment entries.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadEntries()
  }, [])

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((left, right) => {
        const dateCompare = normalizeDateValue(left.date) - normalizeDateValue(right.date)

        if (dateCompare !== 0) {
          return dateCompare
        }

        return Number(left.id) - Number(right.id)
      }),
    [entries]
  )

  const totals = useMemo(
    () =>
      sortedEntries.reduce(
        (total, entry) => {
          total.paid += toNumber(entry.paid)
          total.received += toNumber(entry.received)
          return total
        },
        { paid: 0, received: 0 }
      ),
    [sortedEntries]
  )

  const balance = totals.received - totals.paid

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const savedEntry = await createDividendInvestmentEntry({
        date: form.date,
        client: form.client.trim(),
        paid: toNumber(form.paid),
        received: toNumber(form.received),
      })

      setEntries((prev) => [...prev, savedEntry])
      setForm(initialFormState())
      setSuccessMessage('Dividend / Investment entry saved.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save dividend and investment entry.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Dividend / Investment</h1>
        <p className="mt-2 text-slate-700">
          Enter dividend and investment movements, then review the running table below.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {successMessage ? (
          <p className="mt-3 text-sm text-emerald-700">{successMessage}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                required
              />
            </Field>

            <Field label="Client">
              <input
                type="text"
                value={form.client}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    client: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter client"
                required
              />
            </Field>

            <Field label="Paid">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.paid}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    paid: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter paid amount"
              />
            </Field>

            <Field label="Received">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.received}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    received: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter received amount"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Saved Entries</h2>
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Date</HeaderCell>
                <HeaderCell>Client</HeaderCell>
                <HeaderCell className="text-right">Paid</HeaderCell>
                <HeaderCell className="text-right">Received</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length > 0 ? (
                sortedEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-200">
                    <BodyCell>{formatReportDate(entry.date)}</BodyCell>
                    <BodyCell>{entry.client}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(entry.paid)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(entry.received)}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={4}>
                    {loading
                      ? 'Loading entries...'
                      : 'No dividend or investment entries saved yet.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
            {sortedEntries.length > 0 ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell className="text-right text-slate-900" colSpan={2}>
                    Totals
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totals.paid)}
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totals.received)}
                  </BodyCell>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="max-w-sm">
          <Field label="Balance">
            <input
              type="text"
              value={formatMoney(balance)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
            />
          </Field>
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
    </label>
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
    <th className={`border-b border-r border-slate-200 px-4 py-3 font-semibold ${className}`}>
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

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function normalizeDateValue(value: string | null | undefined) {
  if (!value) {
    return Number.NaN
  }

  return new Date(`${value}T00:00:00`).getTime()
}

function formatReportDate(value: string) {
  const time = normalizeDateValue(value)

  if (!Number.isFinite(time)) {
    return '-'
  }

  const date = new Date(time)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(date.getDate()).padStart(2, '0')
  const month = months[date.getMonth()]
  const year = String(date.getFullYear()).slice(-2)

  return `${day}.${month}.${year}`
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
