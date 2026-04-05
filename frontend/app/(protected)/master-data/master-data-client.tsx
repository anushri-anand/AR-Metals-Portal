'use client'

import { useEffect, useState } from 'react'
import RoleGuard from '@/components/role-guard'
import { fetchAPI } from '@/lib/api'

type Employee = {
  id: number
  name: string
  designation: string
  created_at: string
}

type ProjectItem = {
  id: number
  project: number
  project_name: string
  item_name: string
  quantity: number | null
  unit: string | null
  estimated_mh: number | null
  created_at: string
}

export default function MasterDataClient() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [employeeName, setEmployeeName] = useState('')
  const [designation, setDesignation] = useState('')

  const [projectName, setProjectName] = useState('')
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [estimatedMh, setEstimatedMh] = useState('')

  const pendingProjectItems = projectItems.filter(
    (item) =>
      item.quantity === null ||
      item.unit === null ||
      item.unit === '' ||
      item.estimated_mh === null
  )
  const recentEmployees = [...employees].slice(-5).reverse()
  const recentProjectItems = [...projectItems].slice(-5).reverse()

  async function loadData() {
    try {
      const [employeesData, projectItemsData] = await Promise.all([
        fetchAPI('/master-data/employees/'),
        fetchAPI('/master-data/project-items/'),
      ])

      setEmployees(employeesData)
      setProjectItems(projectItemsData)
      setError('')
    } catch {
      setError('Failed to load master data.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      await fetchAPI('/master-data/employees/', {
        method: 'POST',
        body: JSON.stringify({
          name: employeeName,
          designation,
        }),
      })

      setEmployeeName('')
      setDesignation('')
      setSuccessMessage('Employee saved successfully.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee.')
    }
  }

  async function handleAddProjectItem(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      await fetchAPI('/master-data/project-items/', {
        method: 'POST',
        body: JSON.stringify({
          project_name: projectName,
          item_name: itemName,
          quantity: quantity === '' ? null : Number(quantity),
          unit: unit || null,
          estimated_mh: estimatedMh === '' ? null : Number(estimatedMh),
        }),
      })

      setProjectName('')
      setItemName('')
      setQuantity('')
      setUnit('')
      setEstimatedMh('')
      setSuccessMessage('Project item saved successfully.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project item.')
    }
  }

  async function handleUpdateProjectItem(
    id: number,
    values: {
      quantity: string
      unit: string
      estimated_mh: string
    }
  ) {
    try {
      setError('')
      setSuccessMessage('')

      await fetchAPI(`/master-data/project-items/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantity: values.quantity === '' ? null : Number(values.quantity),
          unit: values.unit === '' ? null : values.unit,
          estimated_mh: values.estimated_mh === '' ? null : Number(values.estimated_mh),
        }),
      })

      setSuccessMessage('Project item updated successfully.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project item.')
    }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold mb-2 text-slate-900">Master Data</h1>
          <p className="text-slate-700">
            Manage employees and project items.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form
            onSubmit={handleAddEmployee}
            className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-900">Add Employee</h2>

            <input
              type="text"
              placeholder="Employee name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              required
            />

            <input
              type="text"
              placeholder="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              required
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
            >
              Save Employee
            </button>
          </form>

          <form
            onSubmit={handleAddProjectItem}
            className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4"
          >
            <h2 className="text-lg font-semibold text-slate-900">Add Project Item</h2>

            <input
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              required
            />

            <input
              type="text"
              placeholder="Item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              required
            />

            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            />

            <input
              type="text"
              placeholder="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            />

            <input
              type="number"
              placeholder="Estimated MH"
              value={estimatedMh}
              onChange={(e) => setEstimatedMh(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
            >
              Save Project Item
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">
            Update Missing Project Items
          </h2>

          {pendingProjectItems.length === 0 ? (
            <p className="text-slate-700">No pending project items found.</p>
          ) : (
            <div className="space-y-4">
              {pendingProjectItems.map((item) => (
                <PendingProjectItemRow
                  key={item.id}
                  item={item}
                  onSave={handleUpdateProjectItem}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Employees</h2>

          {employees.length === 0 ? (
            <p className="text-slate-700">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-slate-900">
                    <th className="py-3 font-semibold">ID</th>
                    <th className="py-3 font-semibold">Name</th>
                    <th className="py-3 font-semibold">Designation</th>
                    <th className="py-3 font-semibold">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-800">{employee.id}</td>
                      <td className="py-3 text-slate-800">{employee.name}</td>
                      <td className="py-3 text-slate-800">{employee.designation}</td>
                      <td className="py-3 text-slate-800">
                        {new Date(employee.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">Project Items</h2>

          {projectItems.length === 0 ? (
            <p className="text-slate-700">No project items found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-slate-900">
                    <th className="py-3 font-semibold">ID</th>
                    <th className="py-3 font-semibold">Project</th>
                    <th className="py-3 font-semibold">Item Name</th>
                    <th className="py-3 font-semibold">Quantity</th>
                    <th className="py-3 font-semibold">Unit</th>
                    <th className="py-3 font-semibold">Estimated MH</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjectItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 text-slate-800">{item.id}</td>
                      <td className="py-3 text-slate-800">{item.project_name}</td>
                      <td className="py-3 text-slate-800">{item.item_name}</td>
                      <td className="py-3 text-slate-800">{item.quantity ?? '-'}</td>
                      <td className="py-3 text-slate-800">{item.unit ?? '-'}</td>
                      <td className="py-3 text-slate-800">{item.estimated_mh ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}

function PendingProjectItemRow({
  item,
  onSave,
}: {
  item: ProjectItem
  onSave: (
    id: number,
    values: { quantity: string; unit: string; estimated_mh: string }
  ) => void
}) {
  const [quantity, setQuantity] = useState(item.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(item.unit ?? '')
  const [estimatedMh, setEstimatedMh] = useState(item.estimated_mh?.toString() ?? '')

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Project</label>
          <input
            value={item.project_name}
            readOnly
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Item</label>
          <input
            value={item.item_name}
            readOnly
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Unit</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Estimated MH</label>
          <input
            type="number"
            value={estimatedMh}
            onChange={(e) => setEstimatedMh(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={() =>
            onSave(item.id, {
              quantity,
              unit,
              estimated_mh: estimatedMh,
            })
          }
          className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          Update
        </button>
      </div>
    </div>
  )
}
