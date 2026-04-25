'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  formatIndianQuantity,
  toNumber,
} from '@/lib/number-format'

type InventoryIssuanceRecord = {
  id: number
  po_number: string
  supplier_name: string
  issuance_date: string
  project_name: string
  project_number: string
  item_description: string
  unit: string
  quantity_issued: string | number
}

export default function InventoryIssuanceLogClient() {
  const [issuances, setIssuances] = useState<InventoryIssuanceRecord[]>([])
  const [selectedItemDescription, setSelectedItemDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchAPI('/procurement/inventory-issuance/')
        setIssuances(Array.isArray(data) ? (data as InventoryIssuanceRecord[]) : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load issuance log.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const itemOptions = useMemo(
    () =>
      Array.from(
        new Set(
          issuances
            .map((issuance) => issuance.item_description || '')
            .filter((value) => value.trim().length > 0)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [issuances]
  )

  const filteredIssuances = useMemo(
    () =>
      issuances
        .filter((issuance) =>
          selectedItemDescription
            ? issuance.item_description === selectedItemDescription
            : true
        )
        .sort((left, right) => {
          if (left.issuance_date !== right.issuance_date) {
            return right.issuance_date.localeCompare(left.issuance_date)
          }

          return left.po_number.localeCompare(right.po_number)
        }),
    [issuances, selectedItemDescription]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Issuance Log</h1>
        <p className="mt-2 text-slate-700">
          Review all inventory issuance entries sorted date-wise.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Item Description</span>
          <select
            value={selectedItemDescription}
            onChange={(event) => setSelectedItemDescription(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 md:max-w-md"
          >
            <option value="">
              {loading ? 'Loading item descriptions...' : 'All item descriptions'}
            </option>
            {itemOptions.map((itemDescription) => (
              <option key={itemDescription} value={itemDescription}>
                {itemDescription}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-slate-700">Loading issuance log...</div>
        ) : (
          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[1080px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                <tr>
                  <HeaderCell>Date</HeaderCell>
                  <HeaderCell>PO #</HeaderCell>
                  <HeaderCell>Supplier Name</HeaderCell>
                  <HeaderCell>Item Description</HeaderCell>
                  <HeaderCell>Project Name</HeaderCell>
                  <HeaderCell>Project #</HeaderCell>
                  <HeaderCell>Quantity Issued</HeaderCell>
                  <HeaderCell>Unit</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {filteredIssuances.length > 0 ? (
                  filteredIssuances.map((issuance) => (
                    <tr key={issuance.id}>
                      <BodyCell>{formatDate(issuance.issuance_date)}</BodyCell>
                      <BodyCell>{issuance.po_number}</BodyCell>
                      <BodyCell>{issuance.supplier_name || '-'}</BodyCell>
                      <BodyCell>{issuance.item_description || '-'}</BodyCell>
                      <BodyCell>{issuance.project_name || '-'}</BodyCell>
                      <BodyCell>{issuance.project_number || '-'}</BodyCell>
                      <BodyCell align="right">
                        {formatIndianQuantity(toNumber(issuance.quantity_issued))}
                      </BodyCell>
                      <BodyCell>{issuance.unit || '-'}</BodyCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="border border-slate-200 px-4 py-8 text-center text-slate-600"
                    >
                      No issuance entries found for the selected item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <td
      className={`border-b border-r border-slate-200 px-4 py-3 text-slate-800 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </td>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
