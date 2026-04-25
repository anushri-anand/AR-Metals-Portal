'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { reserveNextDocumentNumbers } from '@/lib/document-numbering'

type AssociatedCostEntryItem = {
  line_number: number
  employee_id?: string | null
  employee_name?: string | null
  account_code?: string
  cost_code?: string
  item_description: string
  quantity: string
  unit: string
  rate: string
}

type AssociatedCostEntryOption = {
  id: number
  serial_number: string
  entry_type?: 'Labour' | 'Others'
  supplier_name: string
  date: string
  cost_code: string
  items: AssociatedCostEntryItem[]
}

type AssociatedCostPaymentItem = AssociatedCostEntryItem & {
  received_quantity: string
  invoice_number: string
  invoice_date: string | null
  gl_no?: string | null
  gl_date: string | null
}

type AssociatedCostPaymentRecord = {
  id: number
  serial_number: string
  entry_type?: 'Labour' | 'Others'
  supplier_name: string
  advance: string
  recovery_advance: string
  delivery: string
  retention: string
  release_retention: string
  delivery_items: AssociatedCostPaymentItem[]
}

type DeliveryItemForm = {
  lineNumber: number
  employeeId: string
  employeeName: string
  accountCode: string
  costCode: string
  itemDescription: string
  quantity: string
  unit: string
  rate: string
  receivedQuantity: string
  invoiceNumber: string
  invoiceDate: string
  glNo: string
  glDate: string
}

type ExistingProcurementPaymentRecord = {
  phases?: Array<{
    invoice_no?: string
    gl_no?: string
  }>
}

type FormState = {
  serialNumber: string
  entryType: 'Labour' | 'Others'
  supplierName: string
  advance: string
  recoveryAdvance: string
  retention: string
  releaseRetention: string
  deliveryItems: DeliveryItemForm[]
}

const initialForm: FormState = {
  serialNumber: '',
  entryType: 'Labour',
  supplierName: '',
  advance: '',
  recoveryAdvance: '',
  retention: '',
  releaseRetention: '',
  deliveryItems: [],
}

export default function AssociatedCostPaymentForm() {
  const [entries, setEntries] = useState<AssociatedCostEntryOption[]>([])
  const [payments, setPayments] = useState<AssociatedCostPaymentRecord[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [existingInvoiceNumbers, setExistingInvoiceNumbers] = useState<string[]>([])
  const [existingGlNumbers, setExistingGlNumbers] = useState<string[]>([])

  const againstDeliveryTotal = form.deliveryItems.reduce(
    (total, item) =>
      total + Number(item.receivedQuantity || 0) * Number(item.rate || 0),
    0
  )

  const netPayableAmount =
    Number(form.advance || 0) -
    Number(form.recoveryAdvance || 0) +
    againstDeliveryTotal -
    Number(form.retention || 0) +
    Number(form.releaseRetention || 0)

  useEffect(() => {
    async function loadData() {
      try {
        const [entryData, paymentData, procurementPaymentData] = await Promise.all([
          fetchAPI('/employees/associated-cost/'),
          fetchAPI('/employees/associated-cost/payment/'),
          fetchAPI('/procurement/payment/'),
        ])

        setEntries(Array.isArray(entryData) ? entryData : [])
        setPayments(Array.isArray(paymentData) ? paymentData : [])
        setExistingInvoiceNumbers([
          ...collectAssociatedCostInvoiceNumbers(paymentData),
          ...collectProcurementInvoiceNumbers(procurementPaymentData),
        ])
        setExistingGlNumbers([
          ...collectAssociatedCostGlNumbers(paymentData),
          ...collectProcurementGlNumbers(procurementPaymentData),
        ])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load associated cost payment data.'
        )
      } finally {
        setLoadingOptions(false)
      }
    }

    void loadData()
  }, [])

  function handleSerialNumberChange(value: string) {
    const selectedEntry = entries.find((entry) => entry.serial_number === value)
    const existingPayment = payments.find((payment) => payment.serial_number === value)

    setForm({
      serialNumber: value,
      entryType: selectedEntry?.entry_type || existingPayment?.entry_type || 'Labour',
      supplierName: selectedEntry ? selectedEntry.supplier_name : '',
      advance: existingPayment?.advance || '',
      recoveryAdvance: existingPayment?.recovery_advance || '',
      retention: existingPayment?.retention || '',
      releaseRetention: existingPayment?.release_retention || '',
      deliveryItems: buildDeliveryItems(
        selectedEntry,
        existingPayment,
        existingInvoiceNumbers,
        existingGlNumbers
      ),
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleDeliveryItemChange(
    index: number,
    field: keyof Pick<
      DeliveryItemForm,
      'receivedQuantity' | 'invoiceNumber' | 'invoiceDate' | 'glNo' | 'glDate'
    >,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      deliveryItems: prev.deliveryItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const savedPayment = await fetchAPI('/employees/associated-cost/payment/entry/', {
        method: 'POST',
        body: JSON.stringify({
          serial_number: form.serialNumber,
          advance: form.advance || '0',
          recovery_advance: form.recoveryAdvance || '0',
          delivery: formatMoney(againstDeliveryTotal),
          retention: form.retention || '0',
          release_retention: form.releaseRetention || '0',
          delivery_items: form.deliveryItems.map((item) => ({
            line_number: item.lineNumber,
            received_quantity: item.receivedQuantity || '0',
            invoice_number: item.invoiceNumber,
            invoice_date: item.invoiceDate || null,
            gl_no: item.glNo,
            gl_date: item.glDate || null,
          })),
        }),
      })

      setPayments((prev) => {
        const otherPayments = prev.filter(
          (payment) => payment.serial_number !== savedPayment.serial_number
        )
        return [savedPayment, ...otherPayments]
      })
      const selectedEntry = entries.find(
        (entry) => entry.serial_number === savedPayment.serial_number
      )
      setForm({
        serialNumber: savedPayment.serial_number,
        entryType: selectedEntry?.entry_type || savedPayment.entry_type || 'Labour',
        supplierName: selectedEntry ? selectedEntry.supplier_name : '',
        advance: savedPayment.advance || '',
        recoveryAdvance: savedPayment.recovery_advance || '',
        retention: savedPayment.retention || '',
        releaseRetention: savedPayment.release_retention || '',
        deliveryItems: buildDeliveryItems(
          selectedEntry,
          savedPayment,
          existingInvoiceNumbers,
          existingGlNumbers
        ),
      })
      setExistingInvoiceNumbers((prev) => [
        ...prev,
        ...collectAssociatedCostInvoiceNumbers([savedPayment]),
      ])
      setExistingGlNumbers((prev) => [...prev, ...collectAssociatedCostGlNumbers([savedPayment])])
      setMessage('Associated cost payment saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save associated cost payment.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Associated Cost Payment</h1>
        <p className="mt-2 text-slate-700">
          Save payment details against an associated cost SN.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="SN">
            <select
              value={form.serialNumber}
              onChange={(e) => handleSerialNumberChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={loadingOptions}
            >
              <option value="">
                {loadingOptions ? 'Loading SN' : 'Select SN'}
              </option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.serial_number}>
                  {entry.serial_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supplier Name">
            <input
              value={form.supplierName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Type">
            <input
              value={form.entryType}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Advance">
            <input
              type="number"
              step="0.01"
              name="advance"
              value={form.advance}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter advance"
            />
          </Field>

          <Field label="Recovery of Advance">
            <input
              type="number"
              step="0.01"
              name="recoveryAdvance"
              value={form.recoveryAdvance}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter recovery of advance"
            />
          </Field>

          <Field label="Against Delivery">
            <input
              value={formatMoney(againstDeliveryTotal)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Retention">
            <input
              type="number"
              step="0.01"
              name="retention"
              value={form.retention}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter retention"
            />
          </Field>

          <Field label="Release of Retention">
            <input
              type="number"
              step="0.01"
              name="releaseRetention"
              value={form.releaseRetention}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter release of retention"
            />
          </Field>

          <Field label="Net Payable Amount">
            <input
              value={formatMoney(netPayableAmount)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-900"
            />
          </Field>
        </div>

        {form.serialNumber ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Against Delivery Items
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Actual incurred cost is calculated as received quantity multiplied by rate.
              </p>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-[1300px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                  <tr>
                    {form.entryType === 'Labour' ? (
                      <>
                        <HeaderCell>Name of Employee</HeaderCell>
                        <HeaderCell>Employee ID</HeaderCell>
                      </>
                    ) : null}
                    <HeaderCell>Account Code</HeaderCell>
                    <HeaderCell>Cost Code</HeaderCell>
                    <HeaderCell>Item Description</HeaderCell>
                    <HeaderCell>Qty</HeaderCell>
                    <HeaderCell>Unit</HeaderCell>
                    <HeaderCell>Received Quantity</HeaderCell>
                    <HeaderCell>Actual Incurred Cost</HeaderCell>
                    <HeaderCell>Invoice No.</HeaderCell>
                    <HeaderCell>Invoice Date</HeaderCell>
                    <HeaderCell>GL No.</HeaderCell>
                    <HeaderCell>GL Date</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {form.deliveryItems.length > 0 ? (
                    form.deliveryItems.map((item, index) => (
                      <tr key={item.lineNumber} className="border-b border-slate-200">
                        {form.entryType === 'Labour' ? (
                          <>
                            <BodyCell>{item.employeeName || '-'}</BodyCell>
                            <BodyCell>{item.employeeId || '-'}</BodyCell>
                          </>
                        ) : null}
                        <BodyCell>{item.accountCode || '-'}</BodyCell>
                        <BodyCell>{item.costCode || '-'}</BodyCell>
                        <BodyCell>{item.itemDescription || '-'}</BodyCell>
                        <BodyCell>{formatQuantity(item.quantity)}</BodyCell>
                        <BodyCell>{item.unit || '-'}</BodyCell>
                        <BodyCell>
                          <input
                            type="number"
                            step="any"
                            value={item.receivedQuantity}
                            onChange={(e) =>
                              handleDeliveryItemChange(
                                index,
                                'receivedQuantity',
                                e.target.value
                              )
                            }
                            className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="0.00"
                          />
                        </BodyCell>
                        <BodyCell className="text-right">
                          {formatMoney(
                            Number(item.receivedQuantity || 0) *
                              Number(item.rate || 0)
                          )}
                        </BodyCell>
                        <BodyCell>
                          <input
                            value={item.invoiceNumber}
                            onChange={(e) =>
                              handleDeliveryItemChange(
                                index,
                                'invoiceNumber',
                                e.target.value
                              )
                            }
                            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Enter invoice no."
                          />
                        </BodyCell>
                        <BodyCell>
                          <input
                            type="date"
                            value={item.invoiceDate}
                            onChange={(e) =>
                              handleDeliveryItemChange(
                                index,
                                'invoiceDate',
                                e.target.value
                              )
                            }
                            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          />
                        </BodyCell>
                        <BodyCell>
                          <input
                            value={item.glNo}
                            onChange={(e) =>
                              handleDeliveryItemChange(index, 'glNo', e.target.value)
                            }
                            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="Enter GL no."
                          />
                        </BodyCell>
                        <BodyCell>
                          <input
                            type="date"
                            value={item.glDate}
                            onChange={(e) =>
                              handleDeliveryItemChange(
                                index,
                                'glDate',
                                e.target.value
                              )
                            }
                            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          />
                        </BodyCell>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <BodyCell colSpan={form.entryType === 'Labour' ? 13 : 11}>
                        No associated cost items found for the selected SN.
                      </BodyCell>
                    </tr>
                  )}
                </tbody>
                {form.deliveryItems.length > 0 ? (
                  <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                    <tr>
                      <BodyCell
                        className="text-right text-slate-900"
                        colSpan={form.entryType === 'Labour' ? 8 : 6}
                      >
                        Against Delivery Total
                      </BodyCell>
                      <BodyCell className="text-right font-semibold text-slate-900">
                        {formatMoney(againstDeliveryTotal)}
                      </BodyCell>
                      <BodyCell colSpan={4}>{''}</BodyCell>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || !form.serialNumber}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>

          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </form>
    </div>
  )
}

function buildDeliveryItems(
  entry: AssociatedCostEntryOption | undefined,
  payment: AssociatedCostPaymentRecord | undefined,
  existingInvoiceNumbers: string[],
  existingGlNumbers: string[]
) {
  if (!entry) {
    return []
  }

  const paymentItemsByLineNumber = new Map(
    (payment?.delivery_items || []).map((item) => [item.line_number, item])
  )
  const lineItems = entry.items || []
  const missingInvoiceDefaults = reserveNextDocumentNumbers(
    [
      ...existingInvoiceNumbers,
      ...lineItems
        .map((item) => paymentItemsByLineNumber.get(item.line_number)?.invoice_number || '')
        .filter(Boolean),
    ],
    'INV',
    lineItems.filter((item) => !paymentItemsByLineNumber.get(item.line_number)?.invoice_number).length
  )
  const missingGlDefaults = reserveNextDocumentNumbers(
    [
      ...existingGlNumbers,
      ...lineItems
        .map((item) => paymentItemsByLineNumber.get(item.line_number)?.gl_no || '')
        .filter(Boolean),
    ],
    'GL',
    lineItems.filter((item) => !paymentItemsByLineNumber.get(item.line_number)?.gl_no).length
  )
  let invoiceIndex = 0
  let glIndex = 0

  return lineItems.map((item) => {
    const paymentItem = paymentItemsByLineNumber.get(item.line_number)
    const invoiceNumber =
      paymentItem?.invoice_number || missingInvoiceDefaults[invoiceIndex++] || ''
    const glNo = paymentItem?.gl_no || missingGlDefaults[glIndex++] || ''

    return {
      lineNumber: item.line_number,
      employeeId: item.employee_id || '',
      employeeName: item.employee_name || '',
      accountCode: item.account_code || '',
      costCode: item.cost_code || '',
      itemDescription: item.item_description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      receivedQuantity: paymentItem?.received_quantity || '',
      invoiceNumber,
      invoiceDate: paymentItem?.invoice_date || '',
      glNo,
      glDate: paymentItem?.gl_date || '',
    }
  })
}

function collectProcurementInvoiceNumbers(data: unknown) {
  return (Array.isArray(data) ? data : []).flatMap((record: ExistingProcurementPaymentRecord) =>
    (record.phases || []).map((phase) => String(phase.invoice_no || '').trim()).filter(Boolean)
  )
}

function collectProcurementGlNumbers(data: unknown) {
  return (Array.isArray(data) ? data : []).flatMap((record: ExistingProcurementPaymentRecord) =>
    (record.phases || []).map((phase) => String(phase.gl_no || '').trim()).filter(Boolean)
  )
}

function collectAssociatedCostInvoiceNumbers(data: unknown) {
  return (Array.isArray(data) ? data : []).flatMap(
    (record: AssociatedCostPaymentRecord) =>
      (record.delivery_items || [])
        .map((item) => String(item.invoice_number || '').trim())
        .filter(Boolean)
  )
}

function collectAssociatedCostGlNumbers(data: unknown) {
  return (Array.isArray(data) ? data : []).flatMap(
    (record: AssociatedCostPaymentRecord) =>
      (record.delivery_items || [])
        .map((item) => String(item.gl_no || '').trim())
        .filter(Boolean)
  )
}

function formatMoney(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function formatQuantity(value: string) {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) ? numberValue.toString() : value
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

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      className={`border-r border-slate-200 px-4 py-3 align-top text-slate-700 ${className}`.trim()}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}
