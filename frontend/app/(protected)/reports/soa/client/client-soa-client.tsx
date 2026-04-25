'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ClientData,
  ContractPaymentLog,
  getClientData,
  getContractPaymentLogs,
  getTenderLogs,
  TenderLog,
} from '@/lib/estimation-storage'
import {
  buildClientSoaRows,
  formatSoaDate,
  formatSoaMoney,
  getClientLocation,
  getTodayIsoDate,
} from '@/lib/soa'

export default function ClientSoaClient() {
  const [clientData, setClientData] = useState<ClientData[]>([])
  const [tenderLogs, setTenderLogs] = useState<TenderLog[]>([])
  const [contractPaymentLogs, setContractPaymentLogs] = useState<ContractPaymentLog[]>([])
  const [selectedClientName, setSelectedClientName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [clients, tenders, payments] = await Promise.all([
          getClientData(),
          getTenderLogs(),
          getContractPaymentLogs(),
        ])

        setClientData(clients)
        setTenderLogs(tenders)
        setContractPaymentLogs(payments)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client SOA.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const clientOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...clientData.map((item) => item.clientName), ...tenderLogs.map((item) => item.clientName)]
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [clientData, tenderLogs]
  )

  const today = getTodayIsoDate()
  const selectedClient =
    clientData.find((item) => item.clientName === selectedClientName) || null
  const rows = useMemo(
    () =>
      selectedClientName
        ? buildClientSoaRows({
            clientName: selectedClientName,
            contractPaymentLogs,
            tenderLogs,
            today,
          })
        : [],
    [contractPaymentLogs, selectedClientName, tenderLogs, today]
  )

  const totals = useMemo(
    () =>
      rows.reduce(
        (total, row) => {
          total.invoiceAmount += row.invoiceAmount
          total.received += row.received
          total.balanceReceivable += row.balanceReceivable
          return total
        },
        { invoiceAmount: 0, received: 0, balanceReceivable: 0 }
      ),
    [rows]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">SOA - Client</h1>
        <p className="mt-2 text-slate-700">
          Select a client to view open receivables as of today.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Client Name">
            <select
              value={selectedClientName}
              onChange={(event) => setSelectedClientName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading clients...' : 'Select client name'}
              </option>
              {clientOptions.map((clientName) => (
                <option key={clientName} value={clientName}>
                  {clientName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6 text-center">
          <p className="text-xl font-bold text-slate-900">
            {selectedClientName || 'Client'}
          </p>
          {selectedClient ? (
            <p className="mt-1 text-sm text-slate-700">{getClientLocation(selectedClient)}</p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-slate-900">
            As Of: {formatSoaDate(today)}
          </p>
        </div>

        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1320px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-900">
              <tr>
                <HeaderCell>SN</HeaderCell>
                <HeaderCell>Invoice Date</HeaderCell>
                <HeaderCell>Invoice #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Contract / PO Ref</HeaderCell>
                <HeaderCell className="text-right">Invoice Amount</HeaderCell>
                <HeaderCell className="text-right">Received</HeaderCell>
                <HeaderCell className="text-right">Balance Receivable</HeaderCell>
                <HeaderCell>Due Date</HeaderCell>
                <HeaderCell className="text-right">Over Due</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {!selectedClientName ? (
                <tr>
                  <BodyCell colSpan={10}>Select a client name to view the SOA.</BodyCell>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <BodyCell colSpan={10}>No open receivables found for this client.</BodyCell>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.invoiceNumber}-${row.sn}`} className="border-b border-slate-200">
                    <BodyCell>{row.sn}</BodyCell>
                    <BodyCell>{formatSoaDate(row.invoiceDate)}</BodyCell>
                    <BodyCell>{row.invoiceNumber || '-'}</BodyCell>
                    <BodyCell>{row.projectName || '-'}</BodyCell>
                    <BodyCell>{row.contractRef || '-'}</BodyCell>
                    <BodyCell className="text-right">{formatSoaMoney(row.invoiceAmount)}</BodyCell>
                    <BodyCell className="text-right">{formatSoaMoney(row.received)}</BodyCell>
                    <BodyCell className="text-right">{formatSoaMoney(row.balanceReceivable)}</BodyCell>
                    <BodyCell>{formatSoaDate(row.dueDate)}</BodyCell>
                    <BodyCell className="text-right">{row.overDue}</BodyCell>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell colSpan={5}>TOTAL AMOUNT IN AED</BodyCell>
                  <BodyCell className="text-right">{formatSoaMoney(totals.invoiceAmount)}</BodyCell>
                  <BodyCell className="text-right">{formatSoaMoney(totals.received)}</BodyCell>
                  <BodyCell className="text-right">{formatSoaMoney(totals.balanceReceivable)}</BodyCell>
                  <BodyCell />
                  <BodyCell />
                </tr>
              </tfoot>
            ) : null}
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

function HeaderCell({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return <th className={`border border-slate-300 px-3 py-3 font-semibold ${className}`}>{children}</th>
}

function BodyCell({
  children,
  className = '',
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td className={`border border-slate-200 px-3 py-3 text-slate-800 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
