'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import {
  ContractPaymentLog,
  createContractPaymentLog,
  formatMoney,
  getContractPaymentLogs,
} from '@/lib/estimation-storage'

const initialForm = {
  projectNumber: '',
  projectName: '',
  sn: '',
  submittedDate: '',
  approvedDate: '',
  submittedAdvance: '',
  submittedRecoveryAdvance: '',
  grossSubmittedAmount: '',
  submittedRetention: '',
  submittedReleaseRetention: '',
  netSubmittedAmount: '',
  submittedVat: '',
  submittedVatAmount: '',
  netSubmittedIncVat: '',
  approvedAdvance: '',
  approvedRecoveryAdvance: '',
  grossApprovedAmount: '',
  approvedRetention: '',
  approvedReleaseRetention: '',
  netApprovedAmount: '',
  approvedVat: '',
  approvedVatAmount: '',
  netApprovedIncVat: '',
  dueDate: '',
  paidDate: '',
  paidAmount: '',
  forecastDate: '',
}

export default function ContractPaymentLogClient() {
  const [form, setForm] = useState(initialForm)
  const [logs, setLogs] = useState<ContractPaymentLog[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadLogs() {
      try {
        const savedLogs = await getContractPaymentLogs()

        setLogs(savedLogs)
        setForm((prev) => ({
          ...prev,
          sn: String(getNextSn(savedLogs)),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load payment log.'
        )
      }
    }

    loadLogs()
  }, [])

  const visibleLogs = useMemo(
    () =>
      [...logs]
        .filter((log) =>
          form.projectNumber ? log.projectNumber === form.projectNumber : true
        )
        .sort((a, b) => {
          if (a.projectNumber !== b.projectNumber) {
            return a.projectNumber.localeCompare(b.projectNumber)
          }

          return a.sn - b.sn
        }),
    [form.projectNumber, logs]
  )

  const delayText = getDelayText(form.dueDate, form.paidDate)
  const submittedNetAmount = getPaymentNetAmount({
    advance: form.submittedAdvance,
    recoveryAdvance: form.submittedRecoveryAdvance,
    grossAmount: form.grossSubmittedAmount,
    retention: form.submittedRetention,
    releaseRetention: form.submittedReleaseRetention,
  })
  const submittedVatAmount = getVatAmount(
    submittedNetAmount,
    form.submittedVat
  )
  const submittedIncVat = submittedNetAmount + submittedVatAmount
  const approvedNetAmount = getPaymentNetAmount({
    advance: form.approvedAdvance,
    recoveryAdvance: form.approvedRecoveryAdvance,
    grossAmount: form.grossApprovedAmount,
    retention: form.approvedRetention,
    releaseRetention: form.approvedReleaseRetention,
  })
  const approvedVatAmount = getVatAmount(approvedNetAmount, form.approvedVat)
  const approvedIncVat = approvedNetAmount + approvedVatAmount
  const balanceAmount = approvedIncVat - toNumber(form.paidAmount)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const projectLogs = logs.filter(
      (log) => log.projectNumber === value.projectNumber
    )

    setForm((prev) => ({
      ...prev,
      ...value,
      sn: value.projectNumber ? String(getNextSn(projectLogs)) : prev.sn,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const savedLog = await createContractPaymentLog({
        projectNumber: form.projectNumber,
        projectName: form.projectName,
        sn: toNumber(form.sn) || 1,
        submittedDate: form.submittedDate || null,
        approvedDate: form.approvedDate || null,
        submittedAdvance: toNumber(form.submittedAdvance),
        submittedRecoveryAdvance: toNumber(form.submittedRecoveryAdvance),
        grossSubmittedAmount: toNumber(form.grossSubmittedAmount),
        submittedRetention: toNumber(form.submittedRetention),
        submittedReleaseRetention: toNumber(form.submittedReleaseRetention),
        netSubmittedAmount: submittedNetAmount,
        submittedVat: toNumber(form.submittedVat),
        submittedVatAmount,
        netSubmittedIncVat: submittedIncVat,
        approvedAdvance: toNumber(form.approvedAdvance),
        approvedRecoveryAdvance: toNumber(form.approvedRecoveryAdvance),
        grossApprovedAmount: toNumber(form.grossApprovedAmount),
        approvedRetention: toNumber(form.approvedRetention),
        approvedReleaseRetention: toNumber(form.approvedReleaseRetention),
        netApprovedAmount: approvedNetAmount,
        approvedVat: toNumber(form.approvedVat),
        approvedVatAmount,
        netApprovedIncVat: approvedIncVat,
        dueDate: form.dueDate || null,
        paidDate: form.paidDate || null,
        paidAmount: toNumber(form.paidAmount),
        forecastDate: form.forecastDate || null,
      })

      const nextLogs = [savedLog, ...logs]
      const sameProjectLogs = nextLogs.filter(
        (log) => log.projectNumber === form.projectNumber
      )

      setLogs(nextLogs)
      setForm((prev) => ({
        ...initialForm,
        projectNumber: prev.projectNumber,
        projectName: prev.projectName,
        sn: String(getNextSn(sameProjectLogs)),
      }))
      setMessage('Payment log saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment log.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment Log</h1>
        <p className="mt-2 text-slate-700">
          Record submitted and approved payment values for each project.
        </p>
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

          <Field label="SN">
            <input
              type="number"
              name="sn"
              value={form.sn}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              min="1"
              step="1"
              required
            />
          </Field>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Submitted</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Date">
              <input
                type="date"
                name="submittedDate"
                value={form.submittedDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <MoneyField
              label="Advance"
              name="submittedAdvance"
              value={form.submittedAdvance}
              onChange={handleChange}
            />
            <MoneyField
              label="Recovery of Advance"
              name="submittedRecoveryAdvance"
              value={form.submittedRecoveryAdvance}
              onChange={handleChange}
            />
            <MoneyField
              label="Gross Amount"
              name="grossSubmittedAmount"
              value={form.grossSubmittedAmount}
              onChange={handleChange}
            />
            <MoneyField
              label="Retention"
              name="submittedRetention"
              value={form.submittedRetention}
              onChange={handleChange}
            />
            <MoneyField
              label="Release of Retention"
              name="submittedReleaseRetention"
              value={form.submittedReleaseRetention}
              onChange={handleChange}
            />
            <ReadOnlyMoneyField
              label="Net Amount"
              value={submittedNetAmount}
            />
            <MoneyField
              label="VAT (%)"
              name="submittedVat"
              value={form.submittedVat}
              onChange={handleChange}
            />
            <ReadOnlyMoneyField
              label="VAT Amount"
              value={submittedVatAmount}
            />
            <ReadOnlyMoneyField
              label="Net Amount Inc VAT"
              value={submittedIncVat}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Approved</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Date">
              <input
                type="date"
                name="approvedDate"
                value={form.approvedDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </Field>
            <MoneyField
              label="Advance"
              name="approvedAdvance"
              value={form.approvedAdvance}
              onChange={handleChange}
            />
            <MoneyField
              label="Recovery of Advance"
              name="approvedRecoveryAdvance"
              value={form.approvedRecoveryAdvance}
              onChange={handleChange}
            />
            <MoneyField
              label="Gross Amount"
              name="grossApprovedAmount"
              value={form.grossApprovedAmount}
              onChange={handleChange}
            />
            <MoneyField
              label="Retention"
              name="approvedRetention"
              value={form.approvedRetention}
              onChange={handleChange}
            />
            <MoneyField
              label="Release of Retention"
              name="approvedReleaseRetention"
              value={form.approvedReleaseRetention}
              onChange={handleChange}
            />
            <ReadOnlyMoneyField
              label="Net Amount"
              value={approvedNetAmount}
            />
            <MoneyField
              label="VAT (%)"
              name="approvedVat"
              value={form.approvedVat}
              onChange={handleChange}
            />
            <ReadOnlyMoneyField
              label="VAT Amount"
              value={approvedVatAmount}
            />
            <ReadOnlyMoneyField
              label="Net Receivable Inc VAT"
              value={approvedIncVat}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Due Date">
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Received Date">
            <input
              type="date"
              name="paidDate"
              value={form.paidDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <MoneyField
            label="Received Amount"
            name="paidAmount"
            value={form.paidAmount}
            onChange={handleChange}
          />

          <Field label="Delay">
            <input
              value={delayText}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
              readOnly
            />
          </Field>

          <ReadOnlyMoneyField
            label="Balance Receivable"
            value={balanceAmount}
          />

          <Field label="Forecast Date">
            <input
              type="date"
              name="forecastDate"
              value={form.forecastDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
          {message && <p className="text-sm text-green-700">{message}</p>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <p className="mt-1 text-sm text-slate-600">
            All entered payment details
            {form.projectNumber ? ` for ${form.projectNumber}` : ''}.
          </p>
        </div>
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[3500px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Project #
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Project Name
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  SN
                </th>
                <th className="px-4 py-3 text-center font-semibold" colSpan={10}>
                  Submitted
                </th>
                <th className="px-4 py-3 text-center font-semibold" colSpan={10}>
                  Approved
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Due Date
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Received Date
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Received Amount
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Delay
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Balance Receivable
                </th>
                <th className="px-4 py-3 font-semibold" rowSpan={2}>
                  Forecast Date
                </th>
              </tr>
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Advance</th>
                <th className="px-4 py-3 font-semibold">Recovery of Advance</th>
                <th className="px-4 py-3 font-semibold">Gross Amount</th>
                <th className="px-4 py-3 font-semibold">Retention</th>
                <th className="px-4 py-3 font-semibold">Release of Retention</th>
                <th className="px-4 py-3 font-semibold">Net Amount</th>
                <th className="px-4 py-3 font-semibold">VAT (%)</th>
                <th className="px-4 py-3 font-semibold">VAT Amount</th>
                <th className="px-4 py-3 font-semibold">Net Amount Inc VAT</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Advance</th>
                <th className="px-4 py-3 font-semibold">Recovery of Advance</th>
                <th className="px-4 py-3 font-semibold">Gross Amount</th>
                <th className="px-4 py-3 font-semibold">Retention</th>
                <th className="px-4 py-3 font-semibold">Release of Retention</th>
                <th className="px-4 py-3 font-semibold">Net Amount</th>
                <th className="px-4 py-3 font-semibold">VAT (%)</th>
                <th className="px-4 py-3 font-semibold">VAT Amount</th>
                <th className="px-4 py-3 font-semibold">Net Receivable Inc VAT</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-900">{log.projectNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{log.projectName}</td>
                  <td className="px-4 py-3 text-slate-700">{log.sn}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.submittedDate)}
                  </td>
                  <MoneyCell value={log.submittedAdvance} />
                  <MoneyCell value={log.submittedRecoveryAdvance} />
                  <MoneyCell value={log.grossSubmittedAmount} />
                  <MoneyCell value={log.submittedRetention} />
                  <MoneyCell value={log.submittedReleaseRetention} />
                  <MoneyCell value={log.netSubmittedAmount} />
                  <MoneyCell value={log.submittedVat} />
                  <MoneyCell value={log.submittedVatAmount} />
                  <MoneyCell value={log.netSubmittedIncVat} />
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.approvedDate)}
                  </td>
                  <MoneyCell value={log.approvedAdvance} />
                  <MoneyCell value={log.approvedRecoveryAdvance} />
                  <MoneyCell value={log.grossApprovedAmount} />
                  <MoneyCell value={log.approvedRetention} />
                  <MoneyCell value={log.approvedReleaseRetention} />
                  <MoneyCell value={log.netApprovedAmount} />
                  <MoneyCell value={log.approvedVat} />
                  <MoneyCell value={log.approvedVatAmount} />
                  <MoneyCell value={log.netApprovedIncVat} />
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.paidDate)}
                  </td>
                  <MoneyCell value={log.paidAmount} />
                  <td className="px-4 py-3 text-slate-700">
                    {getDelayText(log.dueDate, log.paidDate)}
                  </td>
                  <MoneyCell value={log.netApprovedIncVat - log.paidAmount} />
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(log.forecastDate)}
                  </td>
                </tr>
              ))}

              {visibleLogs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={29}>
                    No payment logs saved yet.
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

function MoneyField({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        min="0"
        step="0.01"
      />
    </Field>
  )
}

function ReadOnlyMoneyField({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <Field label={label}>
      <input
        value={formatMoney(value)}
        readOnly
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
      />
    </Field>
  )
}

function MoneyCell({ value }: { value: number }) {
  return <td className="px-4 py-3 text-slate-700">{formatMoney(value)}</td>
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

function getDelayText(dueDate: string | null, paidDate: string | null) {
  if (!dueDate || !paidDate) {
    return '-'
  }

  const due = new Date(`${dueDate}T00:00:00`).getTime()
  const paid = new Date(`${paidDate}T00:00:00`).getTime()

  if (!Number.isFinite(due) || !Number.isFinite(paid)) {
    return '-'
  }

  return String(Math.round((paid - due) / (1000 * 60 * 60 * 24)))
}

function getNextSn(logs: ContractPaymentLog[]) {
  return logs.reduce((maxSn, log) => Math.max(maxSn, log.sn), 0) + 1
}

function getPaymentNetAmount({
  advance,
  recoveryAdvance,
  grossAmount,
  retention,
  releaseRetention,
}: {
  advance: string
  recoveryAdvance: string
  grossAmount: string
  retention: string
  releaseRetention: string
}) {
  return (
    toNumber(advance) -
    toNumber(recoveryAdvance) +
    toNumber(grossAmount) -
    toNumber(retention) +
    toNumber(releaseRetention)
  )
}

function getVatAmount(netAmount: number, vatPercent: string) {
  return netAmount * (toNumber(vatPercent) / 100)
}

function toNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}
