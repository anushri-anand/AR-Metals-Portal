'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import {
  ContractVariationLog,
  contractVariationStatusOptions,
  createContractVariationLog,
  formatMoney,
  getContractVariationLogs,
} from '@/lib/estimation-storage'

const initialForm = {
  projectNumber: '',
  projectName: '',
  rfvNumber: '',
  clientVariationNumber: '',
  description: '',
  documentRef: '',
  submittedAmount: '',
  armLetterRef: '',
  submittedDate: '',
  approvedAmount: '',
  clientLetterRef: '',
  approvedDate: '',
  status: 'To be Submitted',
  remarks: '',
}

export default function ContractVariationLogClient() {
  const [form, setForm] = useState(initialForm)
  const [logs, setLogs] = useState<ContractVariationLog[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadLogs() {
      try {
        setLogs(await getContractVariationLogs())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load variation log.'
        )
      }
    }

    loadLogs()
  }, [])

  const visibleLogs = useMemo(
    () =>
      form.projectNumber
        ? logs.filter((log) => log.projectNumber === form.projectNumber)
        : logs,
    [form.projectNumber, logs]
  )
  const summaryRows = useMemo(() => buildSummaryRows(visibleLogs), [visibleLogs])

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleProjectChange(value: {
    projectNumber: string
    projectName: string
  }) {
    setForm((prev) => ({
      ...prev,
      ...value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const savedLog = await createContractVariationLog({
        projectNumber: form.projectNumber,
        projectName: form.projectName,
        rfvNumber: form.rfvNumber.trim(),
        clientVariationNumber: form.clientVariationNumber.trim(),
        description: form.description.trim(),
        documentRef: form.documentRef.trim(),
        submittedAmount: toNumber(form.submittedAmount),
        armLetterRef: form.armLetterRef.trim(),
        submittedDate: form.submittedDate || null,
        approvedAmount: toNumber(form.approvedAmount),
        clientLetterRef: form.clientLetterRef.trim(),
        approvedDate: form.approvedDate || null,
        status: form.status,
        remarks: form.remarks.trim(),
      })

      setLogs((prev) => [savedLog, ...prev])
      setForm((prev) => ({
        ...initialForm,
        projectNumber: prev.projectNumber,
        projectName: prev.projectName,
      }))
      setMessage('Variation log saved.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save variation log.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Variation Log</h1>
        <p className="mt-2 text-slate-700">
          Track client variations and summarize submitted/approved values by
          status.
        </p>
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProjectSelectFields
            projectNumber={form.projectNumber}
            projectName={form.projectName}
            onChange={handleProjectChange}
          />

          <Field label="RFV #">
            <input
              name="rfvNumber"
              value={form.rfvNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Client Variation #">
            <input
              name="clientVariationNumber"
              value={form.clientVariationNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Document Ref">
            <input
              name="documentRef"
              value={form.documentRef}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Submitted Amount">
            <input
              type="number"
              name="submittedAmount"
              value={form.submittedAmount}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              min="0"
              step="0.01"
            />
          </Field>

          <Field label="ARM Letter Ref">
            <input
              name="armLetterRef"
              value={form.armLetterRef}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Submitted Date">
            <input
              type="date"
              name="submittedDate"
              value={form.submittedDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Approved Amount">
            <input
              type="number"
              name="approvedAmount"
              value={form.approvedAmount}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              min="0"
              step="0.01"
            />
          </Field>

          <Field label="Client Letter Ref">
            <input
              name="clientLetterRef"
              value={form.clientLetterRef}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Approved Date">
            <input
              type="date"
              name="approvedDate"
              value={form.approvedDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Status">
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {contractVariationStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </Field>

        <Field label="Remarks">
          <textarea
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Variation'}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <p className="mt-1 text-sm text-slate-600">
            Grouped by status{form.projectNumber ? ` for ${form.projectNumber}` : ''}.
          </p>
        </div>
        <div className="max-h-[45vh] w-full max-w-full overflow-auto">
          <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">SN</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Submitted Amount</th>
                <th className="px-4 py-3 font-semibold">Approved Amount</th>
                <th className="px-4 py-3 font-semibold">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((row, index) => (
                <tr key={row.status}>
                  <td className="px-4 py-3 text-slate-900">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-700">{row.status}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.submittedAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.approvedAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[1800px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Project #</th>
                <th className="px-4 py-3 font-semibold">Project Name</th>
                <th className="px-4 py-3 font-semibold">RFV #</th>
                <th className="px-4 py-3 font-semibold">Client Variation #</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Document Ref</th>
                <th className="px-4 py-3 font-semibold">Submitted Amount</th>
                <th className="px-4 py-3 font-semibold">ARM Letter Ref</th>
                <th className="px-4 py-3 font-semibold">Submitted Date</th>
                <th className="px-4 py-3 font-semibold">Approved Amount</th>
                <th className="px-4 py-3 font-semibold">Client Letter Ref</th>
                <th className="px-4 py-3 font-semibold">Approved Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-900">
                    {log.projectNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.projectName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.rfvNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.clientVariationNumber || '-'}
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-700">
                    {log.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.documentRef || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(log.submittedAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.armLetterRef || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.submittedDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(log.approvedAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.clientLetterRef || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.approvedDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.status}</td>
                  <td className="max-w-md px-4 py-3 text-slate-700">
                    {log.remarks || '-'}
                  </td>
                </tr>
              ))}

              {visibleLogs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={14}>
                    No variation logs saved yet.
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

function buildSummaryRows(logs: ContractVariationLog[]) {
  return contractVariationStatusOptions.map((status) => {
    const statusLogs = logs.filter((log) => log.status === status)

    return {
      status,
      submittedAmount: statusLogs.reduce(
        (total, log) => total + log.submittedAmount,
        0
      ),
      approvedAmount: statusLogs.reduce(
        (total, log) => total + log.approvedAmount,
        0
      ),
      count: statusLogs.length,
    }
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
      <label className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  )
}

function formatDate(value: string | null) {
  return value || '-'
}

function toNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}
