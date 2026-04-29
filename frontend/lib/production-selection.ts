import {
  ALL_VARIATIONS_VALUE,
  compareVariationNumbers,
  normalizeVariationNumber,
} from '@/lib/variation-number'

export type ProductionProjectItem = {
  id: number
  boq_sn: string
  package: string
  item_name: string
  quantity: string
  unit: string
}

export type ProductionVariationItem = {
  id: number | string
  boq_sn?: string
  package?: string
  item_name: string
  quantity: string
  unit: string
}

export type ProductionVariationOption = {
  id: number | string
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
    compareVariationNumbers(left.variation_number, right.variation_number)
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

  if (selection.variationNumber === ALL_VARIATIONS_VALUE) {
    return [
      ...project.items,
      ...(project.variations || []).flatMap((variation) => variation.items),
    ].filter((item) => !selection.package || item.package === selection.package)
  }

  if (selection.variationNumber) {
    const variation = (project.variations || []).find(
      (item) =>
        normalizeVariationNumber(item.variation_number) ===
        normalizeVariationNumber(selection.variationNumber)
    )

    return (variation ? variation.items : []).filter(
      (item) => !selection.package || item.package === selection.package
    )
  }

  return project.items.filter(
    (item) => !selection.package || item.package === selection.package
  )
}

export function getPackageOptions(
  selection: ProductionItemSelection,
  projectOptions: ProductionProjectOption[]
) {
  const project = getProjectForSelection(selection, projectOptions)

  const items =
    selection.variationNumber === ALL_VARIATIONS_VALUE
      ? [
          ...(project?.items || []),
          ...((project?.variations || []).flatMap((variation) => variation.items) || []),
        ]
      : selection.variationNumber
        ? (
            (project?.variations || []).find(
              (variation) =>
                normalizeVariationNumber(variation.variation_number) ===
                normalizeVariationNumber(selection.variationNumber)
            )?.items || []
          )
        : (project?.items || [])

  return Array.from(
    new Set(
      items
        .map((item) => item.package)
        .filter((itemPackage): itemPackage is string => Boolean(itemPackage))
    )
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
  if (selection.variationNumber === ALL_VARIATIONS_VALUE || !selection.itemName) {
    return []
  }

  if (selection.variationNumber) {
    return Array.from(
      new Set(
        getItemOptions(selection, projectOptions)
          .filter((item) => item.item_name === selection.itemName)
          .map((item) => item.boq_sn || '')
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right))
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
  if (selection.variationNumber === ALL_VARIATIONS_VALUE) {
    const allItems = getItemOptions(selection, projectOptions)

    if (allItems.length === 0) {
      return null
    }

    if (!selection.itemName) {
      const units = Array.from(new Set(allItems.map((item) => item.unit).filter(Boolean)))
      const quantity = allItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      )

      return {
        ...allItems[0],
        item_name: '',
        boq_sn: '',
        quantity: String(quantity),
        unit: units.length === 1 ? units[0] : 'Mixed',
      }
    }

    if (!selection.boqSn) {
      return allItems.find((item) => item.item_name === selection.itemName) || null
    }

    return (
      allItems.find(
        (item) =>
          item.item_name === selection.itemName &&
          (item.boq_sn || '') === selection.boqSn
      ) || null
    )
  }

  if (selection.variationNumber) {
    const variationItems = getItemOptions(selection, projectOptions)

    if (!selection.itemName) {
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
      variationItems.find(
        (item) =>
          item.item_name === selection.itemName &&
          (!selection.boqSn || (item.boq_sn || '') === selection.boqSn)
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
      variationNumber: normalizeVariationNumber(value),
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
