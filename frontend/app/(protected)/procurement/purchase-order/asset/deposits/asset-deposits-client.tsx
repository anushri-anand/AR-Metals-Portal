'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type AssetDepositRecord = {
  id: number
  serial_number: string
  client_name: string
  project_name: string
  project_name_not_available: boolean
  currency: string
  amount: string | number
  mode_of_payment: string
  expiry_date: string
  status: string
}

type FormState = {
  serialNumber: string
  clientName: string
  projectName: string
  projectNameNotAvailable: boolean
  currency: string
  amount: string
  modeOfPayment: string
  expiryDate: string
  status: string
}

const modeOfPaymentOptions = ['PDC', 'CDC', 'Cash', 'Transfer'] as const
const statusOptions = ['Submitted', 'Returned'] as const

const initialForm: FormState = {
  serialNumber: '',
  clientName: '',
  projectName: '',
  projectNameNotAvailable: false,
  currency: 'AED',
  amount: '',
  modeOfPayment: '',
  expiryDate: '',
  status: 'Submitted',
}

export default function AssetDepositsClient() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [rows, setRows] = useState<AssetDepositRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRows() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchAPI('/procurement/asset-deposits/')
        setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset deposits.')
      } finally {
        setLoading(false)
      }
    }

    void loadRows()
  }, [])

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleProjectNameNotAvailableChange(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      projectNameNotAvailable: checked,
      projectName: checked ? '' : prev.projectName,
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const savedRow = await fetchAPI('/procurement/asset-deposits/entry/', {
        method: 'POST',
        body: JSON.stringify({
          serial_number: form.serialNumber,
          client_name: form.clientName,
          project_name: form.projectName,
          project_name_not_available: form.projectNameNotAvailable,
          currency: form.currency,
          amount: form.amount || '0',
          mode_of_payment: form.modeOfPayment,
          expiry_date: form.expiryDate,
          status: form.status,
        }),
      })

      setRows((prev) => [savedRow, ...prev.filter((row) => row.id !== savedRow.id)])
      setForm(initialForm)
      setMessage('Asset deposit saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset deposit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Asset Deposits</h1>
        <p className="mt-2 text-slate-700">
          Save asset deposit details and review all submitted entries below.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="SN">
            <input
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter SN"
              required
            />
          </Field>

          <Field label="Client Name">
            <input
              name="clientName"
              value={form.clientName}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter client name"
              required
            />
          </Field>

          <Field label="Project Name">
            <input
              name="projectName"
              value={form.projectName}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project name"
              disabled={form.projectNameNotAvailable}
              required={!form.projectNameNotAvailable}
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-900">
              <input
                type="checkbox"
                checked={form.projectNameNotAvailable}
                onChange={(event) =>
                  handleProjectNameNotAvailableChange(event.target.checked)
                }
              />
              Project name not available
            </label>
          </Field>

          <Field label="Currency">
            <input
              name="currency"
              value={form.currency}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter currency"
              required
            />
          </Field>

          <Field label="Amount">
            <input
              type="number"
              step="0.01"
              min="0"
              name="amount"
              value={form.amount}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter amount"
              required
            />
          </Field>

          <Field label="Mode of Payment">
            <select
              name="modeOfPayment"
              value={form.modeOfPayment}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select mode</option>
              {modeOfPaymentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Expiry Date">
            <input
              type="date"
              name="expiryDate"
              value={form.expiryDate}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Status">
            <select
              name="status"
              value={form.status}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Deposits Table</h2>
        </div>
        <div className="max-h-[65vh] overflow-auto">
          <table className="min-w-[1180px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-900">
              <tr>
                <HeaderCell>SN</HeaderCell>
                <HeaderCell>Client Name</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Currency</HeaderCell>
                <HeaderCell>Amount</HeaderCell>
                <HeaderCell>Mode of Payment</HeaderCell>
                <HeaderCell>Expiry Date</HeaderCell>
                <HeaderCell>Status</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={8}>Loading asset deposits...</BodyCell>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <BodyCell colSpan={8}>No asset deposits saved yet.</BodyCell>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200">
                    <BodyCell>{row.serial_number}</BodyCell>
                    <BodyCell>{row.client_name}</BodyCell>
                    <BodyCell>
                      {row.project_name_not_available ? 'Not available' : row.project_name || '-'}
                    </BodyCell>
                    <BodyCell>{row.currency}</BodyCell>
                    <BodyCell>{formatMoney(row.amount)}</BodyCell>
                    <BodyCell>{row.mode_of_payment}</BodyCell>
                    <BodyCell>{formatDate(row.expiry_date)}</BodyCell>
                    <BodyCell>{row.status}</BodyCell>
                  </tr>
                ))
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
  colSpan,
}: {
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <td
      className="border-r border-slate-200 px-4 py-3 align-top text-slate-700"
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

function formatDate(value: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB')
}

function formatMoney(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}
