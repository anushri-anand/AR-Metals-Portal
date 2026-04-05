'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  project_name: string
  item_name: string
}

export default function DeliveryEntryForm() {
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  const [date, setDate] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectItemId, setProjectItemId] = useState('')
  const [deliveryNumber, setDeliveryNumber] = useState('')
  const [deliveryQuantity, setDeliveryQuantity] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAPI('/master-data/project-items/')
        setProjectItems(data)
      } catch {
        setError('Failed to load project items.')
      }
    }

    loadData()
  }, [])

  const projectNames = [...new Set(projectItems.map((item) => item.project_name))]

  const filteredItems = projectName
    ? projectItems.filter((item) => item.project_name === projectName)
    : []

  function handleProjectChange(value: string) {
    setProjectName(value)
    setProjectItemId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
  
    try {
      await fetchAPI('/production/delivery-entries/', {
        method: 'POST',
        body: JSON.stringify({
          project_item: Number(projectItemId),
          date,
          delivery_number: deliveryNumber,
          delivery_quantity: Number(deliveryQuantity),
        }),
      })
  
      setMessage('Delivery entry saved successfully.')
      setDate('')
      setProjectName('')
      setProjectItemId('')
      setDeliveryNumber('')
      setDeliveryQuantity('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delivery entry.')
    }
  }
  
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold mb-2 text-slate-900">Delivery Entry</h1>
      <p className="text-slate-700 mb-6">
        Record delivery note details and delivered quantity.
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
          <label className="block text-sm font-medium text-slate-800 mb-1">Delivery Number</label>
          <input
            type="text"
            value={deliveryNumber}
            onChange={(e) => setDeliveryNumber(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Delivery Quantity</label>
          <input
            type="number"
            min="0"
            value={deliveryQuantity}
            onChange={(e) => setDeliveryQuantity(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            required
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          Save Delivery Entry
        </button>

        {message && <p className="text-green-700">{message}</p>}
        {error && <p className="text-red-700">{error}</p>}
      </form>
    </div>
  )
}
