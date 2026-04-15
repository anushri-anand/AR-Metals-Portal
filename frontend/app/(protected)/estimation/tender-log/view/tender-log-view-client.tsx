'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  TenderLog,
  formatMoney,
  getTenderLogs,
  tenderStatusOptions,
  updateTenderLog,
} from '@/lib/estimation-storage'

export default function TenderLogViewClient() {
  const [tenders, setTenders] = useState<TenderLog[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingTenderId, setSavingTenderId] = useState<string | number | null>(
    null
  )

  useEffect(() => {
    async function loadTenders() {
      try {
        setTenders(await getTenderLogs())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenders.')
      }
    }

    loadTenders()
  }, [])

  const summaryRows = useMemo(() => buildSummaryRows(tenders), [tenders])

  async function handleStatusChange(tender: TenderLog, status: string) {
    const previousTenders = tenders

    setError('')
    setMessage('')
    setSavingTenderId(tender.id)
    setTenders((current) =>
      current.map((item) =>
        item.id === tender.id
          ? {
              ...item,
              status,
            }
          : item
      )
    )

    try {
      const updatedTender = await updateTenderLog(tender.id, { status })
      setTenders((current) =>
        current.map((item) =>
          item.id === tender.id
            ? {
                ...item,
                ...updatedTender,
              }
            : item
        )
      )
      setMessage(`Status updated for tender ${tender.tenderNumber}.`)
    } catch (err) {
      setTenders(previousTenders)
      setError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setSavingTenderId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tender Log View</h1>
        <p className="mt-2 text-slate-700">
          View tender log entries using the latest saved revision for each
          tender.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <p className="mt-1 text-sm text-slate-600">
            Amount and count grouped by current tender status.
          </p>
        </div>
        <div className="max-h-[45vh] w-full max-w-full overflow-auto">
          <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">SN</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Count</th>
                <th className="px-4 py-3 font-semibold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((row, index) => (
                <tr key={row.category}>
                  <td className="px-4 py-3 text-slate-900">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-700">{row.category}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.count}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.percentage.toFixed(2)}%
                  </td>
                </tr>
              ))}

              {summaryRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    No tender summary available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[2200px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Tender #</th>
                <th className="px-4 py-3 font-semibold">Quote Ref.</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Rev#</th>
                <th className="px-4 py-3 font-semibold">Rev Date</th>
                <th className="px-4 py-3 font-semibold">Client Name</th>
                <th className="px-4 py-3 font-semibold">Contact Name</th>
                <th className="px-4 py-3 font-semibold">Project Name</th>
                <th className="px-4 py-3 font-semibold">Project Location</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Quote Amount</th>
                <th className="px-4 py-3 font-semibold">Tender Submission Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenders.map((tender) => (
                <tr key={tender.id}>
                  <td className="px-4 py-3 text-slate-900">
                    {tender.tenderNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tender.quoteRef || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(tender.tenderDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tender.revisionNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(tender.revisionDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tender.clientName || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tender.contactName || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tender.projectName || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {tender.projectLocation || '-'}
                  </td>
                  <td className="max-w-xl px-4 py-3 text-slate-700">
                    {tender.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatMoney(tender.sellingAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(tender.submissionDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <select
                      value={tender.status || 'Under Pricing'}
                      onChange={(event) =>
                        handleStatusChange(tender, event.target.value)
                      }
                      className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      disabled={savingTenderId === tender.id}
                    >
                      {tender.status &&
                        !tenderStatusOptions.includes(
                          tender.status as (typeof tenderStatusOptions)[number]
                        ) && (
                          <option value={tender.status}>{tender.status}</option>
                        )}
                      {tenderStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-700">
                    {tender.remarks || '-'}
                  </td>
                </tr>
              ))}

              {tenders.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={14}>
                    No tender logs saved yet.
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

function buildSummaryRows(tenders: TenderLog[]) {
  const categories = Array.from(
    new Set([
      ...tenderStatusOptions,
      ...tenders.map((tender) => tender.status).filter(Boolean),
    ])
  )
  const totalAmount = tenders.reduce(
    (total, tender) => total + Number(tender.sellingAmount || 0),
    0
  )

  return categories
    .map((category) => {
      const categoryTenders = tenders.filter(
        (tender) => (tender.status || 'Under Pricing') === category
      )
      const amount = categoryTenders.reduce(
        (total, tender) => total + Number(tender.sellingAmount || 0),
        0
      )

      return {
        category,
        amount,
        count: categoryTenders.length,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      }
    })
    .filter((row) => row.count > 0)
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Date(`${value}T00:00:00`).toLocaleDateString()
}
