'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  getAccountCodeOptions,
  getDefaultAccountCode,
  normalizeAccountCode,
  requiresManualAccountCode,
} from '@/lib/account-codes'

type EntryType = 'Labour' | 'Others'
type EmployeeCategory = 'Staff' | 'Labour' | ''

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
  category?: EmployeeCategory
}

type AssociatedCostEntryPreview = {
  serial_number: string
  entry_type?: EntryType
}

type VendorOption = {
  supplier_name: string
}

type AssociatedCostItemForm = {
  employeeId: string
  employeeName: string
  accountCode: string
  costCode: string
  itemDescription: string
  quantity: string
  unit: string
  rate: string
  vatPercent: string
  amount: string
  startDate: string
  endDate: string
}

type FormState = {
  entryType: EntryType
  supplierName: string
  date: string
  numberOfItems: string
  items: AssociatedCostItemForm[]
}

const COST_CODE_OPTIONS = [
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

function createEmptyItem(entryType: EntryType = 'Labour'): AssociatedCostItemForm {
  const defaultCostCode = entryType === 'Others' ? 'FOH' : ''

  return {
    employeeId: '',
    employeeName: '',
    accountCode: getDefaultAccountCode(defaultCostCode),
    costCode: defaultCostCode,
    itemDescription: '',
    quantity: '',
    unit: '',
    rate: '',
    vatPercent: '',
    amount: '',
    startDate: '',
    endDate: '',
  }
}

function createInitialForm(entryType: EntryType = 'Labour'): FormState {
  return {
    entryType,
    supplierName: '',
    date: '',
    numberOfItems: '1',
    items: [createEmptyItem(entryType)],
  }
}

export default function AssociatedCostEntryForm() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])
  const [existingEntries, setExistingEntries] = useState<AssociatedCostEntryPreview[]>([])
  const [form, setForm] = useState<FormState>(createInitialForm())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [employees, entries, vendors] = await Promise.all([
          fetchAPI('/employees/options/'),
          fetchAPI('/employees/associated-cost/'),
          fetchAPI('/procurement/vendor-data/'),
        ])

        setEmployeeOptions(Array.isArray(employees) ? employees : [])
        setExistingEntries(Array.isArray(entries) ? entries : [])
        setVendorOptions(Array.isArray(vendors) ? vendors : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load associated cost entry data.'
        )
      }
    }

    void loadData()
  }, [])

  const nextSerialPreview = useMemo(
    () => buildNextSerialPreview(existingEntries, form.entryType),
    [existingEntries, form.entryType]
  )

  function handleTopLevelChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target

    if (name === 'numberOfItems') {
      const itemCount = Math.max(Number.parseInt(value || '0', 10) || 0, 0)

      setForm((prev) => ({
        ...prev,
        numberOfItems: value,
        items:
          itemCount > 0
            ? Array.from({ length: itemCount }, (_, index) => {
                const currentItem = prev.items[index]
                if (currentItem) {
                  return prev.entryType === 'Others'
                    ? {
                        ...currentItem,
                        employeeId: '',
                        employeeName: '',
                        costCode: currentItem.costCode || 'FOH',
                        accountCode: normalizeAccountCode(
                          currentItem.costCode || 'FOH',
                          currentItem.accountCode
                        ) || getDefaultAccountCode(currentItem.costCode || 'FOH'),
                      }
                    : currentItem
                }

                return createEmptyItem(prev.entryType)
              })
            : [],
      }))
      return
    }

    if (name === 'entryType') {
      const nextEntryType = value as EntryType

      setForm((prev) => ({
        ...prev,
        entryType: nextEntryType,
        items: prev.items.map((item) =>
          nextEntryType === 'Others'
            ? (() => {
                const nextCostCode =
                  item.costCode && item.costCode !== 'Labour' ? item.costCode : 'FOH'

                return {
                  ...item,
                  employeeId: '',
                  employeeName: '',
                  costCode: nextCostCode,
                  accountCode:
                    normalizeAccountCode(nextCostCode, item.accountCode) ||
                    getDefaultAccountCode(nextCostCode),
                }
              })()
            : {
                ...item,
                costCode: (() => {
                  const nextCostCode =
                    item.costCode ||
                    getDefaultCostCodeForEmployee(
                      employeeOptions.find(
                        (employee) => employee.employee_id === item.employeeId
                      )?.category
                    )

                  return nextCostCode
                })(),
                accountCode: (() => {
                  const nextCostCode =
                    item.costCode ||
                    getDefaultCostCodeForEmployee(
                      employeeOptions.find(
                        (employee) => employee.employee_id === item.employeeId
                      )?.category
                    )

                  return normalizeAccountCode(nextCostCode, item.accountCode) || getDefaultAccountCode(nextCostCode)
                })(),
              }
        ),
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleEmployeeIdChange(index: number, value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? (() => {
              const nextCostCode = getDefaultCostCodeForEmployee(selectedEmployee?.category)

              return {
                ...item,
                employeeId: value,
                employeeName: selectedEmployee ? selectedEmployee.employee_name : '',
                costCode: nextCostCode,
                accountCode: getDefaultAccountCode(nextCostCode),
              }
            })()
          : item
      ),
    }))
  }

  function handleEmployeeNameChange(index: number, value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? (() => {
              const nextCostCode = getDefaultCostCodeForEmployee(selectedEmployee?.category)

              return {
                ...item,
                employeeName: value,
                employeeId: selectedEmployee ? selectedEmployee.employee_id : '',
                costCode: nextCostCode,
                accountCode: getDefaultAccountCode(nextCostCode),
              }
            })()
          : item
      ),
    }))
  }

  function handleItemChange(
    index: number,
    field: keyof AssociatedCostItemForm,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        const nextItem = {
          ...item,
          [field]: value,
        }

        if (field === 'costCode') {
          nextItem.accountCode = getDefaultAccountCode(value)
        }

        if (field === 'quantity' || field === 'rate') {
          nextItem.amount = formatMoneyValue(
            Number(nextItem.quantity || 0) * Number(nextItem.rate || 0)
          )
        }

        return nextItem
      }),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      for (const [index, item] of form.items.entries()) {
        const normalizedAccountCode = normalizeAccountCode(item.costCode, item.accountCode)

        if (!normalizedAccountCode) {
          throw new Error(
            requiresManualAccountCode(item.costCode)
              ? `Item ${index + 1}: Account Code is required when Cost Code is FOH.`
              : `Item ${index + 1}: Account Code is required.`
          )
        }
      }

      const savedEntry = await fetchAPI('/employees/associated-cost/entry/', {
        method: 'POST',
        body: JSON.stringify({
          entry_type: form.entryType,
          supplier_name: form.supplierName,
          date: form.date,
          items: form.items.map((item) => ({
            employee_id: form.entryType === 'Labour' ? item.employeeId : '',
            account_code: normalizeAccountCode(item.costCode, item.accountCode),
            cost_code:
              item.costCode ||
              (form.entryType === 'Others' ? 'FOH' : getDefaultCostCodeForEmployee('')),
            item_description: item.itemDescription,
            quantity: item.quantity || '0',
            unit: item.unit,
            rate: item.rate || '0',
            vat_percent: item.vatPercent || '0',
            amount: item.amount || '0',
            start_date: item.startDate,
            end_date: item.endDate,
          })),
        }),
      })

      setExistingEntries((prev) =>
        Array.isArray(savedEntry) ? prev : [savedEntry, ...prev]
      )
      setForm(createInitialForm(form.entryType))
      setMessage(
        `Associated cost entry saved successfully. SN: ${savedEntry?.serial_number || ''}`
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save associated cost entry.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Associated Cost Entry</h1>
        <p className="mt-2 text-slate-700">
          Choose labour or others, then enter the line-wise associated cost details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Type">
            <div className="flex h-full items-center gap-6 rounded-lg border border-slate-300 px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-slate-900">
                <input
                  type="radio"
                  name="entryType"
                  value="Labour"
                  checked={form.entryType === 'Labour'}
                  onChange={handleTopLevelChange}
                />
                Labour
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-900">
                <input
                  type="radio"
                  name="entryType"
                  value="Others"
                  checked={form.entryType === 'Others'}
                  onChange={handleTopLevelChange}
                />
                Others
              </label>
            </div>
          </Field>

          <Field label="SN">
            <input
              value={nextSerialPreview}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Supplier's Name">
            <select
              name="supplierName"
              value={form.supplierName}
              onChange={handleTopLevelChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select supplier name</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.supplier_name} value={vendor.supplier_name}>
                  {vendor.supplier_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date">
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleTopLevelChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="No. of items">
            <input
              type="number"
              min="1"
              name="numberOfItems"
              value={form.numberOfItems}
              onChange={handleTopLevelChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>
        </div>

        {form.items.length > 0 ? (
          <div className="mt-8 space-y-6">
            {form.items.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Item {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                  {form.entryType === 'Labour' ? (
                    <>
                      <Field label="Name of Employee">
                        <select
                          value={item.employeeName}
                          onChange={(e) =>
                            handleEmployeeNameChange(index, e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          required
                        >
                          <option value="">Select employee name</option>
                          {employeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.employee_name}>
                              {employee.employee_name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Employee ID">
                        <select
                          value={item.employeeId}
                          onChange={(e) =>
                            handleEmployeeIdChange(index, e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          required
                        >
                          <option value="">Select employee ID</option>
                          {employeeOptions.map((employee) => (
                            <option key={employee.id} value={employee.employee_id}>
                              {employee.employee_id}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  ) : null}

                  <Field label="Account Code">
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
                  </Field>

                  <Field label="Cost Code">
                    <select
                      value={item.costCode}
                      onChange={(e) =>
                        handleItemChange(index, 'costCode', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required
                    >
                      <option value="">Select cost code</option>
                      {COST_CODE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Item Description">
                    <input
                      value={item.itemDescription}
                      onChange={(e) =>
                        handleItemChange(index, 'itemDescription', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter item description"
                      required
                    />
                  </Field>

                  <Field label="Qty">
                    <input
                      type="number"
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter qty"
                      required
                    />
                  </Field>

                  <Field label="Unit">
                    <input
                      value={item.unit}
                      onChange={(e) =>
                        handleItemChange(index, 'unit', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter unit"
                      required
                    />
                  </Field>

                  <Field label="Rate">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) =>
                        handleItemChange(index, 'rate', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter rate"
                      required
                    />
                  </Field>

                  <Field label="VAT %">
                    <input
                      type="number"
                      step="0.01"
                      value={item.vatPercent}
                      onChange={(e) =>
                        handleItemChange(index, 'vatPercent', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter VAT %"
                    />
                  </Field>

                  <Field label="Amount">
                    <input
                      value={item.amount}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                    />
                  </Field>

                  <Field label="Start Date">
                    <input
                      type="date"
                      value={item.startDate}
                      onChange={(e) =>
                        handleItemChange(index, 'startDate', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required
                    />
                  </Field>

                  <Field label="End Date">
                    <input
                      type="date"
                      value={item.endDate}
                      onChange={(e) =>
                        handleItemChange(index, 'endDate', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-amber-700">
            Enter at least 1 item to save the associated cost entry.
          </p>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || form.items.length === 0}
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

function getDefaultCostCodeForEmployee(category: EmployeeCategory | undefined) {
  return category === 'Labour' ? 'Labour' : 'FOH'
}

function buildNextSerialPreview(
  entries: AssociatedCostEntryPreview[],
  entryType: EntryType
) {
  const prefix = entryType === 'Labour' ? 'LAC' : 'OAC'
  const pattern = new RegExp(`^${prefix}(\\d+)$`)

  const maxNumber = entries.reduce((currentMax, entry) => {
    const match = pattern.exec(entry.serial_number || '')
    if (!match) {
      return currentMax
    }

    return Math.max(currentMax, Number(match[1]))
  }, 0)

  return `${prefix}${String(maxNumber + 1).padStart(3, '0')}`
}

function formatMoneyValue(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
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
