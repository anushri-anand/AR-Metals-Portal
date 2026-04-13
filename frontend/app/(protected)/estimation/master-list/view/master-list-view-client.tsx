'use client'

import { useEffect, useState } from 'react'
import {
  MasterListItem,
  getMasterListItems,
  updateMasterListItem,
} from '@/lib/estimation-storage'

export default function MasterListViewClient() {
  const [items, setItems] = useState<MasterListItem[]>([])
  const [itemFilter, setItemFilter] = useState('')
  const [poFilter, setPoFilter] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadItems() {
      try {
        setItems(await getMasterListItems())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load master list.'
        )
      }
    }

    loadItems()
  }, [])

  const filteredItems = items.filter((item) => {
    const matchesItem = item.itemDescription
      .toLowerCase()
      .includes(itemFilter.toLowerCase())
    const matchesPo = item.poRefNumber
      .toLowerCase()
      .includes(poFilter.toLowerCase())

    return matchesItem && matchesPo
  })

  function handleRateChange(id: string | number, value: string) {
    setItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(id)
          ? {
              ...item,
              rate: Number(value || 0),
            }
          : item
      )
    )
  }

  async function handleRateBlur(item: MasterListItem) {
    setError('')

    try {
      const updatedItem = await updateMasterListItem(item.id, {
        rate: Number(item.rate || 0),
      })
      setItems((prev) =>
        prev.map((currentItem) =>
          String(currentItem.id) === String(item.id) ? updatedItem : currentItem
        )
      )
      setMessage('Rate updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Master List View</h1>
        <p className="mt-2 text-slate-700">
          Filter saved items by item description or PO Ref #. Rates can be
          edited directly in the table.
        </p>
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Item Description Filter">
            <input
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Type any word from item description"
            />
          </Field>

          <Field label="PO Ref # Filter">
            <input
              value={poFilter}
              onChange={(e) => setPoFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Type PO Ref #"
            />
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Item Description</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Rate</th>
                <th className="px-4 py-3 font-semibold">PO Ref #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900">
                    {item.itemDescription}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.unit}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate || ''}
                      onChange={(e) => handleRateChange(item.id, e.target.value)}
                      onBlur={() => handleRateBlur(item)}
                      className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.poRefNumber || '-'}
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                    No master list items found.
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
