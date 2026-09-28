import { getRowDirection, getRowRuns, getRowSide } from '@/features/pattern/crochet/instructions'
import type { PatternProject } from '@/features/pattern/model/types'
import type { ChartExportLegendEntry } from './render-chart'

export interface PdfExportOptions {
  includeWrittenRows: boolean
}

export interface PdfTile {
  columnStart: number
  columnEnd: number
  rowStart: number
  rowEnd: number
  columnPage: number
  columnPages: number
  rowPage: number
  rowPages: number
  cellSizeMm: number
  label: string
}

export interface PdfExportModel {
  title: string
  dimensions: string
  legend: Array<ChartExportLegendEntry & { printSymbol: string }>
  writtenRows: string[]
  tiles: PdfTile[]
}

const pageWidthMm = 210
const pageHeightMm = 297
const chartMarginMm = 15
const chartTopMm = 34
const chartBottomMm = 20
const minimumCellMm = 3
const chartWidthMm = pageWidthMm - chartMarginMm * 2
const chartHeightMm = pageHeightMm - chartTopMm - chartBottomMm
const tileColumns = Math.floor(chartWidthMm / minimumCellMm)
const tileRows = Math.floor(chartHeightMm / minimumCellMm)

export function buildPdfModel (
  project: PatternProject,
  options: PdfExportOptions
): PdfExportModel {
  const counts = new Array<number>(project.palette.length).fill(0)
  for (const paletteIndex of project.grid.cells) counts[paletteIndex] += 1
  const legend = project.palette.map((entry, paletteIndex) => ({
    paletteIndex,
    name: entry.name,
    color: entry.color,
    symbol: entry.symbol,
    printSymbol: printableSymbol(entry.symbol, paletteIndex),
    stitches: counts[paletteIndex]
  }))
  const writtenRows = options.includeWrittenRows
    ? Array.from({ length: project.grid.height }, (_, index) => writtenRow(project, index + 1, legend))
    : []

  return {
    title: project.name,
    dimensions: `${project.grid.width} x ${project.grid.height} stitches`,
    legend,
    writtenRows,
    tiles: buildTiles(project.grid.width, project.grid.height)
  }
}

export async function exportPdf (project: PatternProject, options: PdfExportOptions) {
  const [{ jsPDF }] = await Promise.all([import('jspdf')])
  const model = buildPdfModel(project, options)
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })

  drawSummary(pdf, project, model)
  drawWrittenRows(pdf, model)
  for (const tile of model.tiles) {
    pdf.addPage('a4', 'portrait')
    drawTile(pdf, project, model, tile)
  }

  return pdf.output('blob')
}

function buildTiles (width: number, height: number) {
  const columnPages = Math.ceil(width / tileColumns)
  const rowPages = Math.ceil(height / tileRows)
  const tiles: PdfTile[] = []

  for (let rowPage = 0; rowPage < rowPages; rowPage += 1) {
    const rowStart = rowPage * tileRows
    const rowEnd = Math.min(height, rowStart + tileRows)
    for (let columnPage = 0; columnPage < columnPages; columnPage += 1) {
      const columnStart = columnPage * tileColumns
      const columnEnd = Math.min(width, columnStart + tileColumns)
      const cellSizeMm = Math.min(
        chartWidthMm / (columnEnd - columnStart),
        chartHeightMm / (rowEnd - rowStart)
      )
      tiles.push({
        columnStart,
        columnEnd,
        rowStart,
        rowEnd,
        columnPage: columnPage + 1,
        columnPages,
        rowPage: rowPage + 1,
        rowPages,
        cellSizeMm,
        label: `Page column ${columnPage + 1} of ${columnPages} · rows ${rowStart + 1}-${rowEnd}`
      })
    }
  }

  return tiles
}

function writtenRow (
  project: PatternProject,
  rowNumber: number,
  legend: PdfExportModel['legend']
) {
  const direction = getRowDirection(rowNumber, project.startingSide) === 'right-to-left'
    ? 'Right to left'
    : 'Left to right'
  const side = getRowSide(rowNumber) === 'right-side' ? 'Right side' : 'Wrong side'
  const runs = getRowRuns(project.grid, rowNumber, project.startingSide)
    .map((run) => {
      const entry = legend[run.paletteIndex]
      return `${entry.printSymbol} ${run.count} ${entry.name}`
    })
    .join(' · ')
  return `Row ${rowNumber} · ${direction} · ${side}: ${runs}`
}

function printableSymbol (symbol: string, paletteIndex: number) {
  return /^[\x21-\x7e]{1,2}$/.test(symbol) ? symbol : String(paletteIndex + 1)
}

type PdfDocument = InstanceType<(typeof import('jspdf'))['jsPDF']>

function drawSummary (pdf: PdfDocument, project: PatternProject, model: PdfExportModel) {
  pdf.setFillColor('#f8f3e8')
  pdf.rect(0, 0, pageWidthMm, pageHeightMm, 'F')
  pdf.setTextColor('#182019')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.text(model.title, chartMarginMm, 24)
  pdf.setFont('courier', 'normal')
  pdf.setFontSize(11)
  pdf.text(model.dimensions, chartMarginMm, 33)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(
    `Flat single crochet · ${project.handedness === 'right' ? 'Right-handed' : 'Left-handed'} · start on the ${project.startingSide}`,
    chartMarginMm,
    42
  )
  pdf.setDrawColor('#182019')
  pdf.line(chartMarginMm, 49, pageWidthMm - chartMarginMm, 49)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Yarn key', chartMarginMm, 61)

  model.legend.forEach((entry, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = chartMarginMm + column * 90
    const y = 70 + row * 17
    pdf.setFillColor(entry.color)
    pdf.setDrawColor('#182019')
    pdf.rect(x, y - 6, 10, 10, 'FD')
    pdf.setTextColor(isDark(entry.color) ? '#ffffff' : '#182019')
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(8)
    pdf.text(entry.printSymbol, x + 5, y + 0.5, { align: 'center' })
    pdf.setTextColor('#182019')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(entry.name, x + 14, y - 1)
    pdf.setFont('courier', 'normal')
    pdf.setFontSize(8)
    pdf.text(`${entry.stitches} stitches`, x + 14, y + 4)
  })

  const noteY = Math.max(132, 79 + Math.ceil(model.legend.length / 2) * 17)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('How to read this chart', chartMarginMm, noteY)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  const notes = [
    'Row 1 is the bottom row. Work upward, turning after each row.',
    'Follow the printed row direction and use symbols when colours look similar.',
    `The chart is split across ${model.tiles.length} printable ${model.tiles.length === 1 ? 'page' : 'pages'} at 3 mm or larger per stitch.`
  ]
  pdf.text(notes, chartMarginMm, noteY + 10)
  drawFooter(pdf, 1)
}

function drawWrittenRows (pdf: PdfDocument, model: PdfExportModel) {
  if (model.writtenRows.length === 0) return
  let pageNumber = 1
  let y = 183
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Written rows', chartMarginMm, y)
  y += 9

  for (const row of model.writtenRows) {
    const lines = pdf.splitTextToSize(row, chartWidthMm) as string[]
    const height = lines.length * 4.5 + 2
    if (y + height > pageHeightMm - chartBottomMm) {
      pdf.addPage('a4', 'portrait')
      pageNumber += 1
      pdf.setTextColor('#182019')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.text(`${model.title} · written rows`, chartMarginMm, 20)
      y = 31
    }
    pdf.setFont('courier', 'normal')
    pdf.setFontSize(8)
    pdf.text(lines, chartMarginMm, y)
    y += height
  }
  drawFooter(pdf, pageNumber)
}

function drawTile (
  pdf: PdfDocument,
  project: PatternProject,
  model: PdfExportModel,
  tile: PdfTile
) {
  const columns = tile.columnEnd - tile.columnStart
  const rows = tile.rowEnd - tile.rowStart
  const chartWidth = columns * tile.cellSizeMm
  const chartHeight = rows * tile.cellSizeMm
  const chartX = (pageWidthMm - chartWidth) / 2
  const chartY = chartTopMm

  pdf.setTextColor('#182019')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(model.title, chartMarginMm, 15)
  pdf.setFont('courier', 'normal')
  pdf.setFontSize(8)
  pdf.text(tile.label, chartMarginMm, 22)

  for (let row = tile.rowStart; row < tile.rowEnd; row += 1) {
    for (let column = tile.columnStart; column < tile.columnEnd; column += 1) {
      const paletteIndex = project.grid.cells[row * project.grid.width + column]
      const entry = model.legend[paletteIndex]
      const x = chartX + (column - tile.columnStart) * tile.cellSizeMm
      const y = chartY + (tile.rowEnd - 1 - row) * tile.cellSizeMm
      pdf.setFillColor(entry.color)
      pdf.setDrawColor('#8d897f')
      pdf.setLineWidth(0.12)
      pdf.rect(x, y, tile.cellSizeMm, tile.cellSizeMm, 'FD')
      pdf.setTextColor(isDark(entry.color) ? '#ffffff' : '#182019')
      pdf.setFont('courier', 'bold')
      pdf.setFontSize(Math.max(5, tile.cellSizeMm * 1.7))
      pdf.text(entry.printSymbol, x + tile.cellSizeMm / 2, y + tile.cellSizeMm * 0.7, { align: 'center' })
    }
  }

  drawTileLabels(pdf, tile, chartX, chartY, chartWidth, chartHeight)
  drawFooter(pdf, pdf.getNumberOfPages())
}

function drawTileLabels (
  pdf: PdfDocument,
  tile: PdfTile,
  chartX: number,
  chartY: number,
  chartWidth: number,
  chartHeight: number
) {
  pdf.setTextColor('#182019')
  pdf.setFont('courier', 'normal')
  pdf.setFontSize(6)
  for (const value of labelValues(tile.columnStart + 1, tile.columnEnd)) {
    const x = chartX + (value - 0.5 - tile.columnStart) * tile.cellSizeMm
    pdf.text(String(value), x, chartY - 2, { align: 'center' })
    pdf.text(String(value), x, chartY + chartHeight + 4, { align: 'center' })
  }
  for (const value of labelValues(tile.rowStart + 1, tile.rowEnd)) {
    const y = chartY + chartHeight - (value - 0.5 - tile.rowStart) * tile.cellSizeMm + 1
    pdf.text(String(value), chartX - 2, y, { align: 'right' })
    pdf.text(String(value), chartX + chartWidth + 2, y)
  }
}

function labelValues (start: number, end: number) {
  const values = [start]
  const firstGuide = Math.ceil(start / 5) * 5
  for (let value = firstGuide; value <= end; value += 5) values.push(value)
  if (values.at(-1) !== end) values.push(end)
  return [...new Set(values)]
}

function drawFooter (pdf: PdfDocument, pageNumber: number) {
  pdf.setTextColor('#5f665f')
  pdf.setFont('courier', 'normal')
  pdf.setFontSize(7)
  pdf.text(`Crochet Grids · page ${pageNumber}`, pageWidthMm / 2, pageHeightMm - 8, { align: 'center' })
}

function isDark (hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return (red * 299 + green * 587 + blue * 114) / 1000 < 140
}
