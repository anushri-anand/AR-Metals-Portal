'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import { getStoredCompany } from '@/lib/company'
import { fetchAPI } from '@/lib/api'
import { normalizeVariationNumber } from '@/lib/variation-number'
import {
  BoqItem,
  ContractVariationLog,
  createContractVariationLog,
  getBoqItems,
  getContractVariationLogs,
  getMasterListItems,
  getTenderCostings,
  MasterListItem,
  TenderCosting,
} from '@/lib/estimation-storage'
import {
  Field,
  getLatestVariationLog,
  getLatestVariationSubmittedAmount,
  toAmountInput,
  toNumber,
  VariationProjectOption,
} from '../variation-log-shared'

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

export default function VariationLogEntryClient() {
  const [form, setForm] = useState(initialForm)
  const [logs, setLogs] = useState<ContractVariationLog[]>([])
  const [projectOptions, setProjectOptions] = useState<VariationProjectOption[]>([])
  const [boqItems, setBoqItems] = useState<BoqItem[]>([])
  const [costings, setCostings] = useState<TenderCosting[]>([])
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedLogs,
          savedProjects,
          savedBoqItems,
          savedCostings,
          savedMasterItems,
        ] = await Promise.all([
          getContractVariationLogs(),
          fetchAPI('/production/project-details/options/'),
          getBoqItems(),
          getTenderCostings(),
          getMasterListItems(),
        ])

        setLogs(savedLogs)
        setProjectOptions(savedProjects)
        setBoqItems(savedBoqItems)
        setCostings(savedCostings)
        setMasterItems(savedMasterItems)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load variation log entry.'
        )
      }
    }

    loadData()
  }, [])

  const companyLabel = useMemo(() => getStoredCompany() || 'ARM/AKR', [])

  function buildPrefilledForm(
    nextProjectNumber: string,
    nextProjectName: string,
    nextRfvNumber: string,
    nextClientVariationNumber: string,
    logsSource: ContractVariationLog[] = logs
  ) {
    const latestLog = getLatestVariationLog(
      logsSource,
      nextProjectNumber,
      nextRfvNumber
    )
    const submittedAmount = getLatestVariationSubmittedAmount({
      projectNumber: nextProjectNumber,
      rfvNumber: nextRfvNumber,
      clientVariationNumber:
        nextClientVariationNumber || latestLog?.clientVariationNumber || '',
      logs: logsSource,
      projectOptions,
      boqItems,
      costings,
      masterItems,
    })

    return {
      ...initialForm,
      projectNumber: nextProjectNumber,
      projectName: nextProjectName,
      rfvNumber: nextRfvNumber,
      clientVariationNumber:
        nextClientVariationNumber || latestLog?.clientVariationNumber || '',
      description: latestLog?.description || '',
      documentRef: latestLog?.documentRef || '',
      submittedAmount:
        toAmountInput(submittedAmount) ||
        toAmountInput(latestLog?.submittedAmount || 0),
      armLetterRef: latestLog?.armLetterRef || '',
      submittedDate: latestLog?.submittedDate || '',
      approvedAmount: toAmountInput(latestLog?.approvedAmount || 0),
      clientLetterRef: latestLog?.clientLetterRef || '',
      approvedDate: latestLog?.approvedDate || '',
      status: latestLog?.status || 'To be Submitted',
      remarks: latestLog?.remarks || '',
    }
  }

  function handleProjectChange(value: {
    projectNumber: string
    projectName: string
  }) {
    setForm((prev) =>
      buildPrefilledForm(
        value.projectNumber,
        value.projectName,
        prev.rfvNumber,
        prev.clientVariationNumber
      )
    )
    setMessage('')
    setError('')
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target

    setForm((prev) => {
      if (name === 'rfvNumber') {
        return buildPrefilledForm(
          prev.projectNumber,
          prev.projectName,
          normalizeVariationNumber(value) || value,
          prev.clientVariationNumber
        )
      }

      if (name === 'clientVariationNumber') {
        return buildPrefilledForm(
          prev.projectNumber,
          prev.projectName,
          prev.rfvNumber,
          value
        )
      }

      return {
        ...prev,
        [name]: value,
      }
    })
    setMessage('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const savedLog = await createContractVariationLog({
        projectNumber: form.projectNumber,
        projectName: form.projectName,
        rfvNumber: normalizeVariationNumber(form.rfvNumber) || form.rfvNumber.trim(),
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

      const nextLogs = [savedLog, ...logs]
      setLogs(nextLogs)
      setForm(
        buildPrefilledForm(
          savedLog.projectNumber,
          savedLog.projectName,
          savedLog.rfvNumber,
          savedLog.clientVariationNumber,
          nextLogs
        )
      )
      setMessage('Variation log entry saved.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save variation log entry.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Variation Log Entry</h1>
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
              required
            />
          </Field>

          <Field label="Client Variation #">
            <input
              name="clientVariationNumber"
              value={form.clientVariationNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Document Ref">
            <input
              name="documentRef"
              value={form.documentRef}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
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

          <Field label={`${companyLabel} Letter Ref`}>
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
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                form.submittedDate ? 'text-black' : 'text-neutral-400'
              }`}
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
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                form.approvedDate ? 'text-black' : 'text-neutral-400'
              }`}
            />
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

        <div className="space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
          {message && <p className="text-sm text-green-700">{message}</p>}
        </div>
      </form>
    </div>
  )
}
