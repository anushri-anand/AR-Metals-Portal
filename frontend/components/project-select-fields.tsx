'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  tender_number?: string
  revision_number?: string
}

type ProjectSelectFieldsProps = {
  projectNumber: string
  projectName: string
  onChange: (value: {
    projectNumber: string
    projectName: string
    tenderNumber?: string
    revisionNumber?: string
  }) => void
}

export default function ProjectSelectFields({
  projectNumber,
  projectName,
  onChange,
}: ProjectSelectFieldsProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchAPI('/production/project-details/options/')
        setProjects(data)
      } catch {
        setProjects([])
      }
    }

    loadProjects()
  }, [])

  function handleProjectNumberChange(value: string) {
    const selectedProject = projects.find(
      (project) => project.project_number === value
    )

    onChange({
      projectNumber: value,
      projectName: selectedProject ? selectedProject.project_name : '',
      tenderNumber: selectedProject?.tender_number || '',
      revisionNumber: selectedProject?.revision_number || '',
    })
  }

  function handleProjectNameChange(value: string) {
    const selectedProject = projects.find(
      (project) => project.project_name === value
    )

    onChange({
      projectName: value,
      projectNumber: selectedProject ? selectedProject.project_number : '',
      tenderNumber: selectedProject?.tender_number || '',
      revisionNumber: selectedProject?.revision_number || '',
    })
  }

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Project #
        </label>
        <select
          value={projectNumber}
          onChange={(e) => handleProjectNumberChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          required
        >
          <option value="">Select project #</option>
          {projects.map((project) => (
            <option key={project.id} value={project.project_number}>
              {project.project_number}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Project Name
        </label>
        <select
          value={projectName}
          onChange={(e) => handleProjectNameChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          required
        >
          <option value="">Select project name</option>
          {projects.map((project) => (
            <option key={project.id} value={project.project_name}>
              {project.project_name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
