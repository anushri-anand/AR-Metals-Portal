'use client'

import { useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  getAccountCodeOptions,
  getDefaultAccountCode,
  normalizeAccountCode,
  requiresManualAccountCode,
} from '@/lib/account-codes'

type PettyCashItem = {
  item: string
  accountCode: string
  projectName: string
  projectNumber: string
  costCode: string
  qty: string
  unit: string
  rate: string
  amountExcVat: string
  vatPercent: string
  vatAmount: string
  dueAmountIncVat: string
  paidAmountIncVat: string
  invoiceNumber: string
  invoiceDate: string
  supplierName: string
  balance: string
  forecastDate: string
}

type FormState = {
  voucherNumber: string
  numberOfItems: string
}

const initialForm: FormState = {
  voucherNumber: '',
  numberOfItems: '',
}

const costCodeOptions = [
  'Material',
  'Machining',
  'Coating',
  'Consumables',
  'Subcontracts',
  'Labour',
  'Freight&Customs',
  'Prelims',
  'FOH',
  'Commitments',
  'Contingency',
] as const

function createEmptyItem(): PettyCashItem {
  return {
    item: '',
    accountCode: '',
    projectName: '',
    projectNumber: '',
    costCode: '',
    qty: '',
    unit: '',
    rate: '',
    amountExcVat: '0.00',
    vatPercent: '',
    vatAmount: '0.00',
    dueAmountIncVat: '0.00',
    paidAmountIncVat: '',
    invoiceNumber: '',
    invoiceDate: '',
    supplierName: '',
    balance: '0.00',
    forecastDate: '',
  }
}

function normalizeItemState(item?: Partial<PettyCashItem>): PettyCashItem {
  return {
    ...createEmptyItem(),
    ...item,
  }
}

export default function PettyCashEntryForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [items, setItems] = useState<PettyCashItem[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      const normalizedItem = normalizeItemState(item)
      const qty = toNumber(normalizedItem.qty)
      const rate = toNumber(normalizedItem.rate)
      const amountExcVat = qty * rate
      const vatPercent = toNumber(normalizedItem.vatPercent)
      const vatAmount = amountExcVat * (vatPercent / 100)
      const dueAmountIncVat = amountExcVat + vatAmount
      const paidAmountIncVat = toNumber(normalizedItem.paidAmountIncVat)
      const balance = dueAmountIncVat - paidAmountIncVat

      return {
        ...normalizedItem,
        amountExcVat: amountExcVat.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        dueAmountIncVat: dueAmountIncVat.toFixed(2),
        balance: balance.toFixed(2),
      }
    })
  }, [items])

  const totalDueAmount = useMemo(
    () =>
      normalizedItems.reduce((total, item) => total + toNumber(item.dueAmountIncVat), 0),
    [normalizedItems]
  )
  const totalPaidAmount = useMemo(
    () =>
      normalizedItems.reduce((total, item) => total + toNumber(item.paidAmountIncVat), 0),
    [normalizedItems]
  )
  const totalBalance = useMemo(
    () => normalizedItems.reduce((total, item) => total + toNumber(item.balance), 0),
    [normalizedItems]
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleNumberOfItemsChange(value: string) {
    const itemCount = Math.max(0, Math.trunc(toNumber(value)))

    setForm((prev) => ({
      ...prev,
      numberOfItems: value,
    }))

    setItems((prev) =>
      itemCount > 0
        ? Array.from({ length: itemCount }, (_, index) => normalizeItemState(prev[index]))
        : []
    )
  }

  function handleItemChange(
    index: number,
    field: keyof PettyCashItem,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? field === 'costCode'
            ? {
                ...item,
                costCode: value,
                accountCode: getDefaultAccountCode(value),
              }
            : {
                ...item,
                [field]: value,
              }
          : item
      )
    )
  }

  function validateFormState() {
    if (!form.voucherNumber.trim()) {
      throw new Error('Petty Cash Voucher # is required.')
    }

    if (!normalizedItems.length) {
      throw new Error('Please add at least one petty cash item.')
    }

    normalizedItems.forEach((item, index) => {
      const rowLabel = `Item ${index + 1}`

      if (!item.item.trim()) {
        throw new Error(`${rowLabel}: Item is required.`)
      }

      if (!item.projectName.trim()) {
        throw new Error(`${rowLabel}: Project Name is required.`)
      }

      if (!item.projectNumber.trim()) {
        throw new Error(`${rowLabel}: Project # is required.`)
      }

      if (!item.costCode) {
        throw new Error(`${rowLabel}: Cost Code is required.`)
      }

      if (!normalizeAccountCode(item.costCode, item.accountCode)) {
        throw new Error(
          requiresManualAccountCode(item.costCode)
            ? `${rowLabel}: Account Code is required when Cost Code is FOH.`
            : `${rowLabel}: Account Code is required.`
        )
      }

      if (!item.qty.trim()) {
        throw new Error(`${rowLabel}: Qty is required.`)
      }

      if (toNumber(item.qty) < 0) {
        throw new Error(`${rowLabel}: Qty cannot be negative.`)
      }

      if (!item.unit.trim()) {
        throw new Error(`${rowLabel}: Unit is required.`)
      }

      if (!item.rate.trim()) {
        throw new Error(`${rowLabel}: Rate is required.`)
      }

      if (toNumber(item.rate) < 0) {
        throw new Error(`${rowLabel}: Rate cannot be negative.`)
      }

      if (toNumber(item.amountExcVat) < 0) {
        throw new Error(`${rowLabel}: Amount Exc VAT cannot be negative.`)
      }

      if (!item.vatPercent.trim()) {
        throw new Error(`${rowLabel}: VAT % is required. Enter 0 if VAT does not apply.`)
      }

      if (toNumber(item.vatPercent) < 0) {
        throw new Error(`${rowLabel}: VAT % cannot be negative.`)
      }

      if (!item.paidAmountIncVat.trim()) {
        throw new Error(`${rowLabel}: Paid Amount Inc VAT is required. Enter 0 if unpaid.`)
      }

      if (toNumber(item.paidAmountIncVat) < 0) {
        throw new Error(`${rowLabel}: Paid Amount Inc VAT cannot be negative.`)
      }

      if (toNumber(item.balance) < 0) {
        throw new Error(`${rowLabel}: Paid Amount Inc VAT cannot exceed Payable Amount.`)
      }

      if (!item.invoiceNumber.trim()) {
        throw new Error(`${rowLabel}: Invoice # is required.`)
      }

      if (!item.invoiceDate) {
        throw new Error(`${rowLabel}: Invoice Date is required.`)
      }

      if (!item.supplierName.trim()) {
        throw new Error(`${rowLabel}: Supplier Name is required.`)
      }

      if (!item.forecastDate) {
        throw new Error(`${rowLabel}: Forecast Date is required.`)
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      validateFormState()

      await fetchAPI('/procurement/petty-cash/entry/', {
        method: 'POST',
        body: JSON.stringify({
          voucher_number: form.voucherNumber.trim(),
          items: normalizedItems.map((item) => ({
            item: item.item.trim(),
            account_code: normalizeAccountCode(item.costCode, item.accountCode),
            project_name: item.projectName.trim(),
            project_number: item.projectNumber.trim(),
            cost_code: item.costCode,
            quantity: item.qty.trim(),
            unit: item.unit.trim(),
            rate: toNumber(item.rate).toFixed(2),
            amount_exc_vat: toNumber(item.amountExcVat).toFixed(2),
            vat_percent: toNumber(item.vatPercent).toFixed(2),
            vat_amount: item.vatAmount,
            due_amount_inc_vat: item.dueAmountIncVat,
            paid_amount_inc_vat: toNumber(item.paidAmountIncVat).toFixed(2),
            invoice_number: item.invoiceNumber.trim(),
            invoice_date: item.invoiceDate,
            supplier_name: item.supplierName.trim(),
            balance: item.balance,
            forecast_date: item.forecastDate,
          })),
        }),
      })

      setForm(initialForm)
      setItems([])
      setMessage('Petty cash voucher saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save petty cash voucher.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Petty Cash Entry</h1>
        <p className="mt-2 text-slate-700">
          Enter petty cash voucher details with item-wise VAT, paid amount, and balance.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Petty Cash Voucher #">
            <input
              name="voucherNumber"
              value={form.voucherNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter petty cash voucher number"
              required
            />
          </Field>

          <Field label="No. of Items">
            <input
              type="number"
              min="1"
              name="numberOfItems"
              value={form.numberOfItems}
              onChange={(e) => handleNumberOfItemsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of items"
              required
            />
          </Field>
        </div>

        {normalizedItems.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-[2600px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                    <tr>
                      <TableHead className="w-[220px]">Item</TableHead>
                      <TableHead className="w-[180px]">Account Code</TableHead>
                      <TableHead className="w-[180px]">Project Name</TableHead>
                      <TableHead className="w-[150px]">Project #</TableHead>
                      <TableHead className="w-[150px]">Cost Code</TableHead>
                      <TableHead className="w-[110px]">Qty</TableHead>
                      <TableHead className="w-[110px]">Unit</TableHead>
                      <TableHead className="w-[120px]">Rate</TableHead>
                      <TableHead className="w-[140px]">Amount Exc VAT</TableHead>
                      <TableHead className="w-[100px]">VAT %</TableHead>
                      <TableHead className="w-[130px]">VAT Amount</TableHead>
                      <TableHead className="w-[170px]">Payable Amount</TableHead>
                      <TableHead className="w-[170px]">Paid Amount Inc VAT</TableHead>
                      <TableHead className="w-[150px]">Invoice #</TableHead>
                      <TableHead className="w-[150px]">Invoice Date</TableHead>
                      <TableHead className="w-[180px]">Supplier Name</TableHead>
                      <TableHead className="w-[160px]">Balance to be Paid</TableHead>
                      <TableHead className="w-[160px]">Forecast Date</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedItems.map((item, index) => (
                      <tr key={`petty-cash-item-${index}`} className="border-b border-slate-200">
                        <TableCell>
                          <input
                            value={item.item}
                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder={`Item ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.accountCode}
                            onChange={(e) =>
                              handleItemChange(index, 'accountCode', e.target.value)
                            }
                            disabled={
                              !item.costCode || !requiresManualAccountCode(item.costCode)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                          >
                            <option value="">
                              {item.costCode
                                ? requiresManualAccountCode(item.costCode)
                                  ? 'Select account code'
                                  : 'Auto selected from cost code'
                                : 'Select cost code first'}
                            </option>
                            {getAccountCodeOptions(item.costCode).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.projectName}
                            onChange={(e) =>
                              handleItemChange(index, 'projectName', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Project name"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.projectNumber}
                            onChange={(e) =>
                              handleItemChange(index, 'projectNumber', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Project #"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={item.costCode}
                            onChange={(e) =>
                              handleItemChange(index, 'costCode', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          >
                            <option value="">Select cost code</option>
                            {costCodeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            step="0.000001"
                            min="0"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Qty"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Unit"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Rate"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.amountExcVat}
                            readOnly
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.vatPercent}
                            onChange={(e) =>
                              handleItemChange(index, 'vatPercent', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="VAT %"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.vatAmount}
                            readOnly
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.dueAmountIncVat}
                            readOnly
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.paidAmountIncVat}
                            onChange={(e) =>
                              handleItemChange(index, 'paidAmountIncVat', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.invoiceNumber}
                            onChange={(e) =>
                              handleItemChange(index, 'invoiceNumber', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Invoice #"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="date"
                            value={item.invoiceDate}
                            onChange={(e) =>
                              handleItemChange(index, 'invoiceDate', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.supplierName}
                            onChange={(e) =>
                              handleItemChange(index, 'supplierName', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Supplier name"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            value={item.balance}
                            readOnly
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="date"
                            value={item.forecastDate}
                            onChange={(e) =>
                              handleItemChange(index, 'forecastDate', e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          />
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <ReadOnlyField label="Total Payable Amount" value={formatMoney(totalDueAmount)} />
              <ReadOnlyField label="Total Paid Amount Inc VAT" value={formatMoney(totalPaidAmount)} />
              <ReadOnlyField label="Total Balance to be Paid" value={formatMoney(totalBalance)} />
            </div>
          </>
        ) : null}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Petty Cash'}
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <input
        value={value}
        readOnly
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
      />
    </Field>
  )
}

function TableHead({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <th className={`border-b border-r border-slate-200 px-4 py-3 font-semibold ${className}`}>
      {children}
    </th>
  )
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="border-r border-slate-200 px-4 py-3 align-top">{children}</td>
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
