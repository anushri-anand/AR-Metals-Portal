'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type Employee = {
  id: number
  name: string
  designation: string
}

type ProjectItem = {
  id: number
  project_name: string
  item_name: string
}

export default function WorkEntryForm() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])

  const [date, setDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectItemId, setProjectItemId] = useState('')
  const [hoursWorked, setHoursWorked] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [employeesData, itemsData] = await Promise.all([
          fetchAPI('/master-data/employees/'),
          fetchAPI('/master-data/project-items/'),
        ])

        setEmployees(employeesData)
        setProjectItems(itemsData)
      } catch {
        setError('Failed to load form data.')
      }
    }

    loadData()
  }, [])

  const projectNames = [...new Set(projectItems.map((item) => item.project_name))]

  const filteredItems = projectName
    ? projectItems.filter((item) => item.project_name === projectName)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      await fetchAPI('/employees/work-entries/', {
        method: 'POST',
        body: JSON.stringify({
          employee: Number(employeeId),
          project_item: Number(projectItemId),
          date,
          hours_worked: hoursWorked === '' ? null : Number(hoursWorked),
        }),
      })

      setMessage('Work entry saved successfully.')
      setDate('')
      setEmployeeId('')
      setProjectName('')
      setProjectItemId('')
      setHoursWorked('')
    } catch {
      setError('Failed to save work entry.')
    }
  }

  function handleProjectChange(value: string) {
    setProjectName(value)
    setProjectItemId('')
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold mb-2 text-slate-900">Add Work Entry</h1>
      <p className="text-slate-700 mb-6">
        Create daily work entries for employees.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Employee</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            required
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.designation}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Project</label>
          <select
            value={projectName}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            required
          >
            <option value="">Select project</option>
            {projectNames.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Item</label>
          <select
            value={projectItemId}
            onChange={(e) => setProjectItemId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            required
          >
            <option value="">Select item</option>
            {filteredItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.item_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Hours Worked</label>
          <input
            type="number"
            min="0"
            max="20"
            value={hoursWorked}
            onChange={(e) => setHoursWorked(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            placeholder="Update Later"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          Save Work Entry
        </button>

        {message && <p className="text-green-700">{message}</p>}
        {error && <p className="text-red-700">{error}</p>}
      </form>
    </div>
  )
}
