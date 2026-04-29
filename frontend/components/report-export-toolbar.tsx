'use client'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEffect, useMemo, useState } from 'react'

type ExportMode = 'pdf' | 'excel'

type ExportMeta = {
  title: string
  fileName: string
  modes?: ExportMode[]
}

const REPORT_EXPORT_CHANNEL = 'ar-metals-report-export'

declare global {
  interface Window {
    __downloadReportPreviewPdf?: (
      contentHtml: string,
      fileName: string
    ) => Promise<void>
  }
}

const EXPORT_RENDER_STYLES = `
  .report-export-render {
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
  }
  .report-export-render * {
    color: inherit !important;
  }
  .report-export-render [class*="overflow-auto"],
  .report-export-render [class*="overflow-x-auto"],
  .report-export-render [class*="overflow-y-auto"] {
    overflow: visible !important;
  }
  .report-export-render [class*="max-h-"] {
    max-height: none !important;
  }
  .report-export-render [class*="sticky"] {
    position: static !important;
  }
  .report-export-render button,
  .report-export-render [role="button"],
  .report-export-render [data-export-exclude="true"] {
    display: none !important;
  }
  .report-export-render input,
  .report-export-render select,
  .report-export-render textarea {
    color: #000 !important;
    background: #fff !important;
  }
`

const exportableRouteMatchers: Array<{
  matches: (pathname: string) => boolean
  title: string
  fileName: string
}> = [
  {
    matches: (pathname) => pathname === '/employee/salary/payroll',
    title: 'Payroll',
    fileName: 'Payroll',
  },
  {
    matches: (pathname) => pathname === '/employee/salary/summary',
    title: 'Salary Summary',
    fileName: 'Salary-Summary',
  },
  {
    matches: (pathname) =>
      pathname === '/employee/associated-cost/actual-incurred-cost',
    title: 'Associated Cost Actual Incurred Cost',
    fileName: 'Associated-Cost-Actual-Incurred-Cost',
  },
  {
    matches: (pathname) => pathname === '/employee/salary/actual-incurred-cost',
    title: 'Salary Actual Incurred Cost',
    fileName: 'Salary-Actual-Incurred-Cost',
  },
  {
    matches: (pathname) =>
      pathname === '/procurement/purchase-order/project/actual-incurred-cost',
    title: 'Project Actual Incurred Cost',
    fileName: 'Project-Actual-Incurred-Cost',
  },
  {
    matches: (pathname) =>
      pathname === '/procurement/purchase-order/asset/actual-incurred-cost',
    title: 'Asset Actual Incurred Cost',
    fileName: 'Asset-Actual-Incurred-Cost',
  },
  {
    matches: (pathname) =>
      pathname === '/procurement/purchase-order/inventory/actual-incurred-cost',
    title: 'Inventory Actual Incurred Cost',
    fileName: 'Inventory-Actual-Incurred-Cost',
  },
  {
    matches: (pathname) =>
      pathname === '/procurement/purchase-order/petty-cash/actual-incurred-cost',
    title: 'Petty Cash Actual Incurred Cost',
    fileName: 'Petty-Cash-Actual-Incurred-Cost',
  },
  {
    matches: (pathname) => pathname === '/estimation/tender-log/view',
    title: 'Tender Log View',
    fileName: 'Tender-Log-View',
  },
  {
    matches: (pathname) => pathname === '/estimation/estimated-summary',
    title: 'Estimated Summary',
    fileName: 'Estimated-Summary',
  },
  {
    matches: (pathname) => pathname === '/estimation/bomal',
    title: 'BOMAL',
    fileName: 'BOMAL',
  },
  {
    matches: (pathname) => pathname === '/contract/variation-log',
    title: 'Variation Log',
    fileName: 'Variation-Log',
  },
  {
    matches: (pathname) => pathname === '/contract/payment-log',
    title: 'Payment Log',
    fileName: 'Payment-Log',
  },
  {
    matches: (pathname) =>
      pathname === '/procurement/purchase-order/project/view' ||
      pathname === '/procurement/purchase-order/asset/view' ||
      pathname === '/procurement/purchase-order/inventory/view',
    title: 'Summary of Approved Purchase Orders',
    fileName: 'Approved-Purchase-Orders',
  },
  {
    matches: (pathname) =>
      pathname.startsWith('/reports/') &&
      pathname !== '/reports/cashflow' &&
      pathname !== '/reports/soa',
    title: 'Report',
    fileName: 'Report',
  },
]

export default function ReportExportToolbar({
  pathname,
}: {
  pathname: string
}) {
  const exportMeta = useMemo(() => getExportMeta(pathname), [pathname])
  const availableModes = exportMeta?.modes ?? ['pdf', 'excel']
  const [error, setError] = useState('')

  useEffect(() => {
    let broadcastChannel: BroadcastChannel | null = null

    window.__downloadReportPreviewPdf = async (
      contentHtml: string,
      fileName: string
    ) => {
      const renderHost = document.createElement('div')
      renderHost.setAttribute('aria-hidden', 'true')
      renderHost.style.position = 'fixed'
      renderHost.style.left = '-100000px'
      renderHost.style.top = '0'
      renderHost.style.zIndex = '-1'
      renderHost.style.width = '1600px'
      renderHost.style.background = '#ffffff'
      renderHost.innerHTML = `<style>${EXPORT_RENDER_STYLES}</style><div class="report-export-render">${contentHtml}</div>`
      document.body.appendChild(renderHost)

      const renderTarget =
        renderHost.querySelector<HTMLElement>('.report-export-render')

      if (!renderTarget) {
        renderHost.remove()
        throw new Error('Could not prepare the PDF content for download.')
      }

      try {
        const tables = Array.from(renderTarget.querySelectorAll('table'))
        const widestTable = tables.reduce(
          (maxColumns, table) =>
            Math.max(maxColumns, getTableColumnCount(table as HTMLTableElement)),
          0
        )
        const exportScope =
          renderTarget.querySelector<HTMLElement>('[data-export-kind]') || renderTarget
        const exportKind = exportScope.dataset.exportKind || ''
        const pdf = new jsPDF({
          orientation: widestTable > 8 ? 'landscape' : 'portrait',
          unit: 'pt',
          format: 'a4',
          compress: true,
        })
        const margin = 24
        let cursorY = margin
        const title = getPdfTitle(renderTarget, fileName)
        const textBlocks = getPdfTextBlocks(renderTarget, title)
        const headerImages = await getPdfRenderableImages(renderTarget)

        headerImages.forEach((image) => {
          const pageWidth = pdf.internal.pageSize.getWidth()
          const maxWidth = pageWidth - margin * 2
          const preferredWidth = image.renderedWidth * 0.75
          const preferredHeight = image.renderedHeight * 0.75
          const scale = Math.min(1, maxWidth / preferredWidth)
          const drawWidth = preferredWidth * scale
          const drawHeight = preferredHeight * scale

          pdf.addImage(
            image.dataUrl,
            image.format,
            margin,
            cursorY,
            drawWidth,
            drawHeight
          )
          cursorY += drawHeight + 12
        })

        if (exportKind !== 'payroll-slip') {
          cursorY = renderPdfTextBlock(pdf, title, margin, cursorY, {
            fontSize: 14,
            fontStyle: 'bold',
            spacingAfter: 12,
          })

          textBlocks.forEach((textBlock) => {
            cursorY = renderPdfTextBlock(pdf, textBlock, margin, cursorY, {
              fontSize: 10,
              fontStyle: 'normal',
              spacingAfter: 8,
            })
          })
        }

        if (tables.length === 0) {
          const fallbackText = collapseWhitespace(renderTarget.textContent || '')

          if (fallbackText && !textBlocks.includes(fallbackText)) {
            renderPdfTextBlock(pdf, fallbackText, margin, cursorY, {
              fontSize: 10,
              fontStyle: 'normal',
              spacingAfter: 0,
            })
          }
        } else {
          tables.forEach((table) => {
            autoTable(pdf, {
              html: table,
              startY: cursorY,
              margin: {
                left: margin,
                right: margin,
              },
              theme: 'grid',
              styles: {
                font: 'helvetica',
                fontSize: getPdfTableFontSize(
                  getTableColumnCount(table as HTMLTableElement)
                ),
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.25,
                cellPadding: 3,
                overflow: 'linebreak',
                halign: 'left',
                valign: 'middle',
              },
              headStyles: {
                fillColor: [241, 245, 249],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
              },
              bodyStyles: {
                textColor: [0, 0, 0],
              },
              footStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
              },
              alternateRowStyles: {
                fillColor: [255, 255, 255],
              },
              didParseCell: (hookData) => {
                if (hookData.section === 'head') {
                  hookData.cell.styles.halign = 'center'
                  return
                }

                const explicitAlignment = getPdfCellAlignment(hookData.cell.raw)

                if (explicitAlignment) {
                  hookData.cell.styles.halign = explicitAlignment
                  return
                }

                if (
                  isNumericLikeText(
                    getAutoTableCellText(hookData.cell.raw, hookData.cell.text.join(' '))
                  )
                ) {
                  hookData.cell.styles.halign = 'right'
                }
              },
            })

            cursorY =
              (
                pdf as jsPDF & {
                  lastAutoTable?: {
                    finalY: number
                  }
                }
              ).lastAutoTable?.finalY ?? cursorY
            cursorY += 16
          })
        }

        pdf.save(`${fileName}.pdf`)
      } finally {
        renderHost.remove()
      }
    }

    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(REPORT_EXPORT_CHANNEL)
      broadcastChannel.onmessage = async (event) => {
        const payload = event.data as
          | {
              type?: string
              contentHtml?: string
              fileName?: string
            }
          | undefined

        if (
          payload?.type !== 'download-pdf' ||
          !payload.contentHtml ||
          !payload.fileName
        ) {
          return
        }

        try {
          await window.__downloadReportPreviewPdf?.(
            payload.contentHtml,
            payload.fileName
          )
          broadcastChannel?.postMessage({
            type: 'download-pdf-complete',
            fileName: payload.fileName,
          })
        } catch (error) {
          console.error(error)
          broadcastChannel?.postMessage({
            type: 'download-pdf-error',
            fileName: payload.fileName,
          })
        }
      }
    }

    return () => {
      broadcastChannel?.close()
      delete window.__downloadReportPreviewPdf
    }
  }, [])

  if (!exportMeta) {
    return null
  }

  function handleOpenPreview(mode: ExportMode) {
    setError('')

    try {
      if (!exportMeta) {
        throw new Error('This page is not available for export.')
      }

      const exportRoot =
        document.querySelector<HTMLElement>('[data-export-scope="true"]') ||
        document.querySelector<HTMLElement>('[data-export-root="true"]')

      if (!exportRoot) {
        throw new Error('Could not find the report content to export.')
      }

      const clonedRoot = cloneExportRoot(exportRoot)
      const previewWindow = window.open('', '_blank')

      if (!previewWindow) {
        throw new Error('Please allow popups to preview the export.')
      }

      const html = buildPreviewHtml({
        title: resolveTitle(exportRoot, exportMeta.title),
        fileName: buildFileName(exportMeta.fileName),
        contentHtml: clonedRoot.outerHTML,
        initialMode: mode,
        availableModes,
      })

      previewWindow.document.open()
      previewWindow.document.write(html)
      previewWindow.document.close()
      previewWindow.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open export preview.')
    }
  }

  return (
    <div
      data-export-exclude="true"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h3 className="text-base font-semibold text-slate-900">Export</h3>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {availableModes.includes('pdf') ? (
          <button
            type="button"
            onClick={() => handleOpenPreview('pdf')}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Export PDF
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => handleOpenPreview('excel')}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Export Excel
        </button>
      </div>
    </div>
  )
}

function getExportMeta(pathname: string): ExportMeta | null {
  const match = exportableRouteMatchers.find((entry) => entry.matches(pathname))

  if (!match) {
    return null
  }

  if (pathname.startsWith('/reports/cashflow/view')) {
    return {
      title: 'Cash Flow Report',
      fileName: 'Cash-Flow-Report',
    }
  }

  if (pathname.startsWith('/reports/cashflow/dividend-investment')) {
    return {
      title: 'Dividend Investment Report',
      fileName: 'Dividend-Investment-Report',
    }
  }

  if (pathname.startsWith('/reports/pcr')) {
    return {
      title: 'PCR',
      fileName: 'PCR',
    }
  }

  if (pathname.startsWith('/reports/bur')) {
    return {
      title: 'BUR',
      fileName: 'BUR',
      modes: ['excel'],
    }
  }

  if (pathname === '/reports/vat') {
    return {
      title: 'VAT Summary',
      fileName: 'VAT-Summary',
    }
  }

  if (pathname.startsWith('/reports/vat/')) {
    return {
      title: 'VAT Detail',
      fileName: 'VAT-Detail',
    }
  }

  if (pathname === '/reports/corporate-tax') {
    return {
      title: 'Corporate Tax Summary',
      fileName: 'Corporate-Tax-Summary',
    }
  }

  if (pathname.startsWith('/reports/corporate-tax/')) {
    return {
      title: 'Corporate Tax Detail',
      fileName: 'Corporate-Tax-Detail',
    }
  }

  if (pathname.startsWith('/reports/cost-ledger')) {
    return {
      title: 'Cost Ledger',
      fileName: 'Cost-Ledger',
    }
  }

  if (pathname.startsWith('/reports/soa/client')) {
    return {
      title: 'Client SOA',
      fileName: 'Client-SOA',
    }
  }

  if (pathname.startsWith('/reports/soa/supplier')) {
    return {
      title: 'Supplier SOA',
      fileName: 'Supplier-SOA',
    }
  }

  if (pathname.startsWith('/reports/gl-period-closing')) {
    return {
      title: 'GL Period Closing',
      fileName: 'GL-Period-Closing',
    }
  }

  return {
    title: match.title,
    fileName: match.fileName,
  }
}

function cloneExportRoot(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement
  removeExportFilterSections(clone)
  pruneExportLayout(clone)
  syncFormValues(root, clone)
  replaceFormFieldsWithText(clone)
  formatExportTables(clone)

  clone.querySelectorAll('[data-export-exclude="true"]').forEach((element) => {
    element.remove()
  })

  return clone
}

function removeExportFilterSections(root: HTMLElement) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    if (!(heading instanceof HTMLElement)) {
      return
    }

    if (collapseWhitespace(heading.textContent || '') !== 'Filters') {
      return
    }

    let container: HTMLElement | null = heading

    while (container && container !== root) {
      const hasFormFields = Boolean(
        container.querySelector('input, select, textarea, button')
      )
      const hasTable = Boolean(container.querySelector('table'))

      if (hasFormFields && !hasTable) {
        container.remove()
        return
      }

      container = container.parentElement
    }
  })
}

function pruneExportLayout(root: HTMLElement) {
  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) {
      return
    }

    const hasFormFields = Boolean(
      child.querySelector('input, select, textarea, button')
    )
    const hasTable = Boolean(child.querySelector('table'))

    if (hasFormFields && !hasTable) {
      child.remove()
    }
  })
}

function syncFormValues(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceFields = sourceRoot.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >('input, select, textarea')
  const cloneFields = cloneRoot.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >('input, select, textarea')

  sourceFields.forEach((sourceField, index) => {
    const cloneField = cloneFields[index]

    if (!cloneField) {
      return
    }

    if (sourceField instanceof HTMLInputElement) {
      if (sourceField.type === 'checkbox' || sourceField.type === 'radio') {
        cloneField.toggleAttribute('checked', sourceField.checked)
      } else {
        cloneField.setAttribute('value', sourceField.value)
      }
      cloneField.disabled = true
      return
    }

    if (sourceField instanceof HTMLSelectElement && cloneField instanceof HTMLSelectElement) {
      Array.from(cloneField.options).forEach((option) => {
        option.selected = option.value === sourceField.value
      })
      cloneField.disabled = true
      return
    }

    if (sourceField instanceof HTMLTextAreaElement && cloneField instanceof HTMLTextAreaElement) {
      cloneField.value = sourceField.value
      cloneField.textContent = sourceField.value
      cloneField.disabled = true
    }
  })
}

function replaceFormFieldsWithText(root: HTMLElement) {
  root
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    )
    .forEach((field) => {
      const replacement = root.ownerDocument.createElement('span')
      replacement.textContent = getFieldDisplayValue(field)
      replacement.style.display = 'inline-block'
      replacement.style.minHeight = '1rem'
      replacement.style.color = '#000'
      field.replaceWith(replacement)
    })
}

function formatExportTables(root: HTMLElement) {
  root.querySelectorAll('table').forEach((table) => {
    table.querySelectorAll('th').forEach((cell) => {
      if (cell instanceof HTMLElement) {
        cell.style.textAlign = 'center'
      }
    })

    table.querySelectorAll('td').forEach((cell) => {
      if (!(cell instanceof HTMLElement)) {
        return
      }

      if (isNumericLikeText(cell.textContent || '')) {
        cell.style.textAlign = 'right'
      }
    })
  })
}

function getFieldDisplayValue(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
) {
  if (field instanceof HTMLSelectElement) {
    return field.selectedOptions[0]?.textContent?.trim() || field.value || '-'
  }

  if (field instanceof HTMLTextAreaElement) {
    return field.value || '-'
  }

  if (field.type === 'checkbox' || field.type === 'radio') {
    return field.checked ? 'Yes' : 'No'
  }

  return field.value || '-'
}

function isNumericLikeText(value: string) {
  const normalized = collapseWhitespace(value)

  if (!normalized || normalized === '-' || normalized === '—' || normalized === '–') {
    return false
  }

  const strippedCurrency = normalized.replace(/^[A-Z]{2,5}\s+/, '')
  const accountingValue = strippedCurrency.replace(/^\((.*)\)$/, '-$1')
  const compactValue = accountingValue.replace(/,/g, '')

  return /^-?\d+(\.\d+)?%?$/.test(compactValue)
}

function getAutoTableCellText(raw: unknown, fallback: string) {
  if (raw instanceof HTMLElement) {
    return raw.textContent || fallback
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw)
  }

  if (Array.isArray(raw)) {
    return raw.map((value) => String(value)).join(' ')
  }

  return fallback
}

async function getPdfRenderableImages(
  root: HTMLElement
): Promise<
  Array<{
    dataUrl: string
    format: 'PNG'
    width: number
    height: number
    renderedWidth: number
    renderedHeight: number
  }>
> {
  const imageElements = Array.from(root.querySelectorAll('img')).slice(0, 1)
  const candidates = await Promise.all(
    imageElements.map(async (image) => loadPdfRenderableImage(image))
  )
  const images: Array<{
    dataUrl: string
    format: 'PNG'
    width: number
    height: number
    renderedWidth: number
    renderedHeight: number
  }> = []

  candidates.forEach((candidate) => {
    if (candidate) {
      images.push(candidate)
    }
  })

  return images
}

async function loadPdfRenderableImage(image: HTMLImageElement) {
  const source = image.currentSrc || image.src

  if (!source) {
    return null
  }

  const loadedImage = await new Promise<HTMLImageElement | null>((resolve) => {
    const nextImage = new Image()
    nextImage.crossOrigin = 'anonymous'
    nextImage.onload = () => resolve(nextImage)
    nextImage.onerror = () => resolve(null)
    nextImage.src = source
  })

  if (!loadedImage) {
    return null
  }

  const rect = image.getBoundingClientRect()
  const renderedWidth = rect.width || image.clientWidth || loadedImage.naturalWidth
  const renderedHeight =
    rect.height || image.clientHeight || loadedImage.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = loadedImage.naturalWidth
  canvas.height = loadedImage.naturalHeight
  const context = canvas.getContext('2d')

  if (!context) {
    return null
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(loadedImage, 0, 0)

  return {
    dataUrl: canvas.toDataURL('image/png'),
    format: 'PNG' as const,
    width: loadedImage.naturalWidth,
    height: loadedImage.naturalHeight,
    renderedWidth,
    renderedHeight,
  }
}

function getPdfCellAlignment(raw: unknown): 'left' | 'center' | 'right' | null {
  const element = raw instanceof HTMLElement ? raw : null

  if (!element) {
    return null
  }

  const alignAttribute = element.getAttribute('align')

  if (
    alignAttribute === 'left' ||
    alignAttribute === 'center' ||
    alignAttribute === 'right'
  ) {
    return alignAttribute
  }

  if (element.classList.contains('text-right')) {
    return 'right'
  }

  if (element.classList.contains('text-center')) {
    return 'center'
  }

  if (element.classList.contains('text-left')) {
    return 'left'
  }

  const inlineAlignment = element.style.textAlign

  if (
    inlineAlignment === 'left' ||
    inlineAlignment === 'center' ||
    inlineAlignment === 'right'
  ) {
    return inlineAlignment
  }

  if (typeof window !== 'undefined') {
    const computedAlignment = window.getComputedStyle(element).textAlign

    if (
      computedAlignment === 'left' ||
      computedAlignment === 'center' ||
      computedAlignment === 'right'
    ) {
      return computedAlignment
    }
  }

  return null
}

function resolveTitle(root: HTMLElement, fallbackTitle: string) {
  const heading = root.querySelector('h1')

  if (!heading?.textContent?.trim()) {
    return fallbackTitle
  }

  return heading.textContent.trim()
}

function buildFileName(baseName: string) {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${sanitizeFileName(baseName)}-${year}${month}${day}`
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-')
}

function getPdfTitle(root: HTMLElement, fallbackFileName: string) {
  const heading = root.querySelector('h1, h2, h3')
  const headingText = collapseWhitespace(heading?.textContent || '')

  if (headingText) {
    return headingText
  }

  return fallbackFileName.replace(/-/g, ' ')
}

function getPdfTextBlocks(root: HTMLElement, title: string) {
  const seen = new Set<string>()

  return Array.from(root.querySelectorAll('h1, h2, h3, h4, p'))
    .filter((element) => !element.closest('table'))
    .map((element) => collapseWhitespace(element.textContent || ''))
    .filter((text) => text && text !== title)
    .filter((text) => {
      if (seen.has(text)) {
        return false
      }

      seen.add(text)
      return true
    })
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function getTableColumnCount(table: HTMLTableElement) {
  const rows = Array.from(table.rows)

  if (rows.length === 0) {
    return 0
  }

  return rows.reduce((maxColumns, row) => {
    const columnCount = Array.from(row.cells).reduce(
      (sum, cell) => sum + (cell.colSpan || 1),
      0
    )

    return Math.max(maxColumns, columnCount)
  }, 0)
}

function getPdfTableFontSize(columnCount: number) {
  if (columnCount >= 16) {
    return 5
  }

  if (columnCount >= 12) {
    return 6
  }

  if (columnCount >= 9) {
    return 7
  }

  return 8
}

function renderPdfTextBlock(
  pdf: jsPDF,
  text: string,
  margin: number,
  startY: number,
  options: {
    fontSize: number
    fontStyle: 'normal' | 'bold'
    spacingAfter: number
  }
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const usableWidth = pageWidth - margin * 2
  const lines = pdf.splitTextToSize(text, usableWidth)
  const lineHeight = options.fontSize * 1.35
  let cursorY = startY

  if (cursorY + lines.length * lineHeight > pageHeight - margin) {
    pdf.addPage()
    cursorY = margin
  }

  pdf.setFont('helvetica', options.fontStyle)
  pdf.setFontSize(options.fontSize)
  pdf.setTextColor(0, 0, 0)
  pdf.text(lines, margin, cursorY)

  return cursorY + lines.length * lineHeight + options.spacingAfter
}

function buildPreviewHtml({
  title,
  fileName,
  contentHtml,
  initialMode,
  availableModes,
}: {
  title: string
  fileName: string
  contentHtml: string
  initialMode: ExportMode
  availableModes: ExportMode[]
}) {
  const headAssets = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((node) => node.outerHTML)
    .join('\n')

  const safeTitle = escapeHtml(title)
  const safeFileName = escapeHtml(fileName)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        ${headAssets}
        <style>
          ${EXPORT_RENDER_STYLES}
          body {
            margin: 0;
            background: #f3f4f6;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
          }
          .toolbar {
            position: sticky;
            top: 0;
            z-index: 50;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 16px 20px;
            border-bottom: 1px solid #cbd5e1;
            background: #fff;
          }
          .toolbar-title {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
          }
          .toolbar-subtitle {
            margin-top: 4px;
            font-size: 13px;
            color: #334155;
          }
          .toolbar-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .toolbar button {
            border: 0;
            border-radius: 10px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          .toolbar .primary {
            background: #0f172a;
            color: #fff;
          }
          .toolbar .secondary {
            background: #fff;
            color: #111827;
            border: 1px solid #cbd5e1;
          }
          .preview-note {
            padding: 10px 20px 0;
            font-size: 12px;
            color: #475569;
          }
          .preview-shell {
            margin: 0 auto;
            max-width: 1600px;
            padding: 20px;
          }
          .report-content {
            background: #fff;
            color: #000;
          }
          @media print {
            .toolbar,
            .preview-note {
              display: none !important;
            }
            body {
              background: #fff;
            }
            .preview-shell {
              max-width: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div>
            <div class="toolbar-title">${safeTitle} Preview</div>
          </div>
          <div class="toolbar-actions">
            ${
              availableModes.includes('pdf')
                ? `<button id="download-pdf-button" class="${initialMode === 'pdf' ? 'primary' : 'secondary'}" onclick="downloadPdf()">Download PDF</button>`
                : ''
            }
            <button class="${initialMode === 'excel' ? 'primary' : 'secondary'}" onclick="downloadExcel()">Download Excel</button>
            <button class="secondary" onclick="window.close()">Close</button>
          </div>
        </div>
        <div class="preview-shell">
          <div id="preview-content" class="report-content">${contentHtml}</div>
        </div>
        <script>
          const exportFileName = ${JSON.stringify(safeFileName)};
          const reportExportChannelName = ${JSON.stringify(REPORT_EXPORT_CHANNEL)};

          async function downloadPdf() {
            const downloadButton = document.getElementById('download-pdf-button');
            const originalText = downloadButton ? downloadButton.textContent : 'Download PDF';

            if (downloadButton) {
              downloadButton.disabled = true;
              downloadButton.textContent = 'Downloading...';
            }

            try {
              const source = document.getElementById('preview-content');
              if (!source) {
                throw new Error('Preview content is not available.');
              }

              if (typeof window.BroadcastChannel !== 'undefined') {
                await requestPdfDownloadViaChannel(source.innerHTML, exportFileName);
              } else if (
                window.opener &&
                typeof window.opener.__downloadReportPreviewPdf === 'function'
              ) {
                await window.opener.__downloadReportPreviewPdf(
                  source.innerHTML,
                  exportFileName
                );
              } else {
                throw new Error('No PDF download channel is available.');
              }
            } catch (error) {
              console.error(error);
              alert('Could not download the PDF. Please try again.');
            } finally {
              if (downloadButton) {
                downloadButton.disabled = false;
                downloadButton.textContent = originalText;
              }
            }
          }

          function requestPdfDownloadViaChannel(contentHtml, fileName) {
            return new Promise((resolve, reject) => {
              const channel = new BroadcastChannel(reportExportChannelName);
              let timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error('PDF download timed out.'));
              }, 30000);

              function cleanup() {
                window.clearTimeout(timeoutId);
                channel.close();
              }

              channel.onmessage = function(event) {
                const payload = event.data || {};

                if (payload.fileName !== fileName) {
                  return;
                }

                if (payload.type === 'download-pdf-complete') {
                  cleanup();
                  resolve();
                  return;
                }

                if (payload.type === 'download-pdf-error') {
                  cleanup();
                  reject(new Error('PDF download failed.'));
                }
              };

              channel.postMessage({
                type: 'download-pdf',
                contentHtml,
                fileName,
              });
            });
          }

          function downloadExcel() {
            const source = document.getElementById('preview-content');

            if (!source) {
              return;
            }

            const workbook = [
              '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
              '<head>',
              '<meta charset="utf-8" />',
              '<meta name="ProgId" content="Excel.Sheet" />',
              '<meta name="Generator" content="Microsoft Excel 15" />',
              '<style>',
              'table { border-collapse: collapse; }',
              'th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }',
              '.text-left { text-align: left; }',
              '.text-right { text-align: right; }',
              '.text-center { text-align: center; }',
              '.font-bold { font-weight: 700; }',
              '.align-top { vertical-align: top; }',
              '[data-export-kind="payroll-slip"] { width: 760px; }',
              '[data-export-kind="payroll-slip"] table { width: 100%; table-layout: fixed; }',
              '[data-export-kind="payroll-slip"] .payroll-logo { display: block; width: auto; max-width: 440px; height: 64px; object-fit: contain; }',
              '[data-export-kind="payroll-slip"] .payroll-title-cell { font-size: 20px; font-weight: 700; text-align: center; }',
              '[data-export-kind="payroll-slip"] .payroll-section-heading { font-size: 18px; font-weight: 700; text-align: center; }',
              '[data-export-kind="payroll-slip"] .payroll-column-heading { font-weight: 700; text-align: center; }',
              '[data-export-kind="payroll-slip"] .payroll-meta-label, [data-export-kind="payroll-slip"] .payroll-meta-value { font-weight: 700; }',
              '[data-export-kind="payroll-slip"] .payroll-netpay { font-size: 18px; font-weight: 700; text-align: center; }',
              '[data-export-kind="payroll-slip"] .payroll-signature-cell { height: 96px; vertical-align: top; font-weight: 700; border: none !important; padding-top: 12px; }',
              '[data-export-kind="payroll-slip"] .payroll-signature-table { margin-top: 8px; }',
              '</style>',
              '</head>',
              '<body>',
              source.innerHTML,
              '</body>',
              '</html>',
            ].join('');

            const blob = new Blob([workbook], {
              type: 'application/vnd.ms-excel',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = exportFileName + '.xls';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          }
        </script>
      </body>
    </html>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
