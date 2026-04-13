'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import ProjectSelectFields from '@/components/project-select-fields'

type PurchaseOrder = {
  id: number
  po_number: string
  supplier_name: string
  item_description: string
}

type ParsedItem = {
  item: string
  quantity: string
  unit: string
}

export default function InventoryIssuanceForm() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [poNumber, setPoNumber] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [itemName, setItemName] = useState('')
  const [quantityIssued, setQuantityIssued] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPurchaseOrders() {
      try {
        const data = await fetchAPI('/procurement/purchase-order/')
        setPurchaseOrders(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load purchase orders.'
        )
      }
    }

    loadPurchaseOrders()
  }, [])

  const supplierOptions = useMemo(() => {
    return Array.from(new Set(purchaseOrders.map((po) => po.supplier_name)))
  }, [purchaseOrders])

  const filteredPurchaseOrders = useMemo(() => {
    if (!supplierName) return purchaseOrders
    return purchaseOrders.filter((po) => po.supplier_name === supplierName)
  }, [purchaseOrders, supplierName])

  const selectedPo = purchaseOrders.find((po) => po.po_number === poNumber)

  const itemOptions = useMemo(() => {
    if (!selectedPo) return []
    return parseItems(selectedPo.item_description)
  }, [selectedPo])

  const selectedItem = itemOptions.find((item) => item.item === itemName)

  function handlePoChange(value: string) {
    const po = purchaseOrders.find((item) => item.po_number === value)

    setPoNumber(value)
    setSupplierName(po ? po.supplier_name : '')
    setItemName('')
  }

  function handleSupplierChange(value: string) {
    setSupplierName(value)
    setPoNumber('')
    setItemName('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Inventory issuance form is ready. Backend save will be connected next.')
    console.log({
      poNumber,
      supplierName,
      itemName,
      totalProcuredQuantity: selectedItem?.quantity || '',
      unit: selectedItem?.unit || '',
      quantityIssued,
      projectName,
      projectNumber,
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Issuance</h1>
        <p className="mt-2 text-slate-700">
          Issue procured inventory items to a project.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Supplier Name">
            <select
              value={supplierName}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select supplier</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </Field>

          <Field label="PO #">
            <select
              value={poNumber}
              onChange={(e) => handlePoChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select PO #</option>
              {filteredPurchaseOrders.map((po) => (
                <option key={po.id} value={po.po_number}>
                  {po.po_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Item">
            <select
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={!selectedPo}
            >
              <option value="">Select item</option>
              {itemOptions.map((item) => (
                <option key={item.item} value={item.item}>
                  {item.item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Total Procured Quantity">
            <input
              value={selectedItem?.quantity || ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Unit">
            <input
              value={selectedItem?.unit || ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Quantity Issued to Project">
            <input
              type="number"
              step="0.01"
              value={quantityIssued}
              onChange={(e) => setQuantityIssued(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter quantity issued"
              required
            />
          </Field>

          <ProjectSelectFields
            projectNumber={projectNumber}
            projectName={projectName}
            onChange={(value) => {
                setProjectNumber(value.projectNumber)
                setProjectName(value.projectName)
            }}
            />

        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Save Issuance
          </button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>
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

function parseItems(value: string): ParsedItem[] {
  return value
    .split('\n')
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim())

      const item = parts[0]?.replace(/^\d+\.\s*/, '') || ''
      const quantity = parts.find((part) => part.startsWith('Qty:'))?.replace('Qty:', '').trim() || ''
      const unit = parts.find((part) => part.startsWith('Unit:'))?.replace('Unit:', '').trim() || ''

      return { item, quantity, unit }
    })
    .filter((item) => item.item)
}
