export type ProductionProjectItem = {
  id: number
  boq_sn: string
  package: string
  item_name: string
  quantity: string
  unit: string
}

export type ProductionVariationItem = {
  id: number
  package?: string
  item_name: string
  quantity: string
  unit: string
}

export type ProductionVariationOption = {
  id: number
  variation_number: string
  items: ProductionVariationItem[]
}

export type ProductionProjectOption = {
  id: number
  project_name: string
  project_number: string
  items: ProductionProjectItem[]
  variations?: ProductionVariationOption[]
}

export type ProductionItemSelection = {
  projectNumber: string
  variationNumber: string
  projectName: string
  package: string
  itemName: string
  boqSn: string
}

export function getProjectForSelection(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  return projectOptions.find(
    (project) =>
      project.project_number === selection.projectNumber ||
      project.project_name === selection.projectName
  )
}

export function getVariationOptions(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  const project = getProjectForSelection(selection, projectOptions)
  return (project?.variations || []).slice().sort((left, right) =>
    left.variation_number.localeCompare(right.variation_number)
  )
}

export function getItemOptions(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  const project = getProjectForSelection(selection, projectOptions)

  if (!project) {
    return []
  }

  if (selection.variationNumber) {
    const variation = (project.variations || []).find(
      (item) => item.variation_number === selection.variationNumber
    )

    return variation ? variation.items : []
  }

  return project.items.filter(
    (item) => !selection.package || item.package === selection.package
  )
}

export function getPackageOptions(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  if (selection.variationNumber) {
    return []
  }

  const project = getProjectForSelection(selection, projectOptions)

  return Array.from(
    new Set((project?.items || []).map((item) => item.package).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right))
}

export function getItemNameOptions(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  return Array.from(
    new Set(getItemOptions(selection, projectOptions).map((item) => item.item_name))
  ).sort((left, right) => left.localeCompare(right))
}

export function getBoqSnOptions(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  if (selection.variationNumber || !selection.itemName) {
    return []
  }

  const project = getProjectForSelection(selection, projectOptions)

  return Array.from(
    new Set(
      (project?.items || [])
        .filter(
          (item) =>
            item.item_name === selection.itemName &&
            (!selection.package || item.package === selection.package)
        )
        .map((item) => item.boq_sn)
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right))
}

export function getSelectedItem(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  if (selection.variationNumber) {
    if (!selection.itemName) {
      const variationItems = getItemOptions(selection, projectOptions)
      if (variationItems.length === 0) {
        return null
      }

      const units = Array.from(new Set(variationItems.map((item) => item.unit).filter(Boolean)))
      const quantity = variationItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      )

      return {
        ...variationItems[0],
        item_name: '',
        boq_sn: '',
        quantity: String(quantity),
        unit: units.length === 1 ? units[0] : 'Mixed',
      }
    }

    return (
      getItemOptions(selection, projectOptions).find(
        (item) => item.item_name === selection.itemName
      ) || null
    )
  }

  const project = getProjectForSelection(selection, projectOptions)
  const matchingItems = (project?.items || []).filter(
    (item) =>
      (!selection.itemName || item.item_name === selection.itemName) &&
      (!selection.package || item.package === selection.package)
  )

  if (!selection.itemName && selection.package && matchingItems.length > 0) {
    const units = Array.from(new Set(matchingItems.map((item) => item.unit).filter(Boolean)))
    const quantity = matchingItems.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    )

    return {
      ...matchingItems[0],
      item_name: '',
      boq_sn: '',
      quantity: String(quantity),
      unit: units.length === 1 ? units[0] : 'Mixed',
    }
  }

  if (!selection.boqSn) {
    return matchingItems[0] || null
  }

  return matchingItems.find((item) => item.boq_sn === selection.boqSn) || null
}

export function updateProjectItemSelection(
  selection: ProductionItemSelection,
  field:
    | 'projectNumber'
    | 'variationNumber'
    | 'projectName'
    | 'package'
    | 'itemName'
    | 'boqSn',
  value: string,
  projectOptions: ProductionProjectOption[]
) {
  if (field === 'projectNumber') {
    const selectedProject = projectOptions.find(
      (project) => project.project_number === value
    )

    return {
      ...selection,
      projectNumber: value,
      variationNumber: '',
      projectName: selectedProject ? selectedProject.project_name : '',
      package: '',
      itemName: '',
      boqSn: '',
    }
  }

  if (field === 'variationNumber') {
    return {
      ...selection,
      variationNumber: value,
      package: '',
      itemName: '',
      boqSn: '',
    }
  }

  if (field === 'projectName') {
    const selectedProject = projectOptions.find(
      (project) => project.project_name === value
    )

    return {
      ...selection,
      projectName: value,
      projectNumber: selectedProject ? selectedProject.project_number : '',
      variationNumber: '',
      package: '',
      itemName: '',
      boqSn: '',
    }
  }

  if (field === 'package') {
    return {
      ...selection,
      package: value,
      itemName: '',
      boqSn: '',
    }
  }

  if (field === 'itemName') {
    if (selection.variationNumber) {
      return {
        ...selection,
        itemName: value,
        boqSn: '',
      }
    }

    const project = getProjectForSelection(selection, projectOptions)
    const boqSnOptions = (project?.items || [])
      .filter(
        (item) =>
          item.item_name === value &&
          (!selection.package || item.package === selection.package)
      )
      .map((item) => item.boq_sn)
      .filter(Boolean)

    return {
      ...selection,
      itemName: value,
      boqSn: boqSnOptions.length === 1 ? boqSnOptions[0] : '',
    }
  }

  return {
    ...selection,
    boqSn: value,
  }
}
