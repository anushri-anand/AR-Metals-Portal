'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import ProjectSelectFields from '@/components/project-select-fields'

type PurchaseOrderItem = {
  line_number: number
  item_description: string
  quantity: string | number
  unit: string
  rate: string | number
}

type PurchaseOrder = {
  id: number
  po_number: string
  supplier_name: string
  purchase_items: PurchaseOrderItem[]
}

type InventoryIssuanceRecord = {
  id: number
  po_number: string
  line_number: number
  issuance_date: string
  project_name: string
  project_number: string
  quantity_issued: string | number
}

export default function InventoryIssuanceForm() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [issuances, setIssuances] = useState<InventoryIssuanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [supplierName, setSupplierName] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [lineNumber, setLineNumber] = useState('')
  const [issuanceDate, setIssuanceDate] = useState('')
  const [quantityToIssue, setQuantityToIssue] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [purchaseOrderData, issuanceData] = await Promise.all([
          fetchAPI('/procurement/purchase-order/?order_type=inventory&status=approved'),
          fetchAPI('/procurement/inventory-issuance/'),
        ])

        setPurchaseOrders(Array.isArray(purchaseOrderData) ? purchaseOrderData : [])
        setIssuances(Array.isArray(issuanceData) ? issuanceData : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load inventory issuance data.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const supplierOptions = useMemo(
    () => Array.from(new Set(purchaseOrders.map((po) => po.supplier_name))).sort(),
    [purchaseOrders]
  )

  const filteredPurchaseOrders = useMemo(() => {
    if (!supplierName) {
      return purchaseOrders
    }

    return purchaseOrders.filter((po) => po.supplier_name === supplierName)
  }, [purchaseOrders, supplierName])

  const selectedPo = useMemo(
    () => purchaseOrders.find((po) => po.po_number === poNumber) || null,
    [purchaseOrders, poNumber]
  )

  const selectedItem = useMemo(() => {
    if (!selectedPo || !lineNumber) {
      return null
    }

    return (
      selectedPo.purchase_items.find((item) => String(item.line_number) === lineNumber) || null
    )
  }, [lineNumber, selectedPo])

  const quantityAlreadyIssued = useMemo(() => {
    if (!poNumber || !lineNumber) {
      return 0
    }

    return issuances.reduce((total, issuance) => {
      if (
        issuance.po_number === poNumber &&
        String(issuance.line_number) === lineNumber
      ) {
        return total + toNumber(issuance.quantity_issued)
      }

      return total
    }, 0)
  }, [issuances, lineNumber, poNumber])

  const totalProcuredQuantity = toNumber(selectedItem?.quantity)
  const quantityToIssueValue = toNumber(quantityToIssue)
  const remainingQuantity = totalProcuredQuantity - quantityAlreadyIssued - quantityToIssueValue

  function resetEntryFields() {
    setLineNumber('')
    setIssuanceDate('')
    setQuantityToIssue('')
    setProjectName('')
    setProjectNumber('')
  }

  function handleSupplierChange(value: string) {
    setSupplierName(value)
    setPoNumber('')
    resetEntryFields()
  }

  function handlePoChange(value: string) {
    const purchaseOrder = purchaseOrders.find((po) => po.po_number === value)
    setPoNumber(value)
    setSupplierName(purchaseOrder?.supplier_name || '')
    resetEntryFields()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      if (!poNumber) {
        throw new Error('PO # is required.')
      }

      if (!lineNumber) {
        throw new Error('Item Description is required.')
      }

      if (!issuanceDate) {
        throw new Error('Issuance Date is required.')
      }

      if (!projectName.trim() || !projectNumber.trim()) {
        throw new Error('Project Name and Project # are required.')
      }

      if (quantityToIssueValue <= 0) {
        throw new Error('Quantity to Issue must be greater than 0.')
      }

      if (remainingQuantity < 0) {
        throw new Error('Quantity to Issue cannot exceed the remaining quantity.')
      }

      const savedIssuance = await fetchAPI('/procurement/inventory-issuance/entry/', {
        method: 'POST',
        body: JSON.stringify({
          po_number: poNumber,
          line_number: Number(lineNumber),
          issuance_date: issuanceDate,
          project_name: projectName.trim(),
          project_number: projectNumber.trim(),
          quantity_issued: quantityToIssue,
        }),
      })

      setIssuances((prev) => [...prev, savedIssuance as InventoryIssuanceRecord])
      resetEntryFields()
      setMessage('Inventory issuance saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save inventory issuance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Issuance Entry</h1>
        <p className="mt-2 text-slate-700">
          Issue procured inventory items to a project.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Supplier Name">
            <select
              value={supplierName}
              onChange={(event) => handleSupplierChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading suppliers...' : 'Select supplier'}
              </option>
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
              onChange={(event) => handlePoChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading PO #' : 'Select PO #'}
              </option>
              {filteredPurchaseOrders.map((po) => (
                <option key={po.id} value={po.po_number}>
                  {po.po_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Item Description">
            <select
              value={lineNumber}
              onChange={(event) => setLineNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={!selectedPo}
            >
              <option value="">Select item description</option>
              {(selectedPo?.purchase_items || []).map((item) => (
                <option key={item.line_number} value={item.line_number}>
                  {item.item_description}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Issuance Date">
            <input
              type="date"
              value={issuanceDate}
              onChange={(event) => setIssuanceDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Total Procured Quantity">
            <input
              value={formatQuantity(totalProcuredQuantity)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Quantity already Issued">
            <input
              value={formatQuantity(quantityAlreadyIssued)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Quantity to Issue">
            <input
              type="number"
              step="any"
              min="0"
              value={quantityToIssue}
              onChange={(event) => setQuantityToIssue(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter quantity to issue"
              required
            />
          </Field>

          <Field label="Remaining Quantity">
            <input
              value={formatQuantity(Math.max(remainingQuantity, 0))}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
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
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Issuance'}
          </button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
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

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatQuantity(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}
