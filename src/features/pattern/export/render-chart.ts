import { getRowDirection } from '@/features/pattern/crochet/instructions'
import type { PatternProject, RowDirection } from '@/features/pattern/model/types'

export type PngExportMode = 'grid-only' | 'labelled'

export interface ChartExportOptions {
  mode: PngExportMode
  minimumLongEdge?: number
}

export interface ChartExportCell {
  column: number
  row: number
  x: number
  y: number
  size: number
  color: string
  symbol: string
  paletteIndex: number
}

export interface ChartExportLabel {
  value: number
  x: number
  y: number
}

export interface ChartExportLegendEntry {
  paletteIndex: number
  name: string
  color: string
  symbol: string
  stitches: number
}

export interface ChartExportRowArrow {
  row: number
  direction: RowDirection
  x: number
  y: number
}

export interface ChartRenderModel {
  mode: PngExportMode
  title: string
  dimensions: string
  canvasWidth: number
  canvasHeight: number
  chartX: number
  chartY: number
  chartWidth: number
  chartHeight: number
  cellSize: number
  cells: ChartExportCell[]
  columnLabels: ChartExportLabel[]
  rowLabels: ChartExportLabel[]
  rowArrows: ChartExportRowArrow[]
  legend: ChartExportLegendEntry[]
}

const minimumCellSize = 12
const labelledMargins = { top: 150, right: 110, bottom: 210, left: 110 }
const colors = {
  paper: '#f8f3e8',
  ink: '#182019',
  muted: '#5f665f',
  grid: '#9c978c',
  guide: '#182019'
}

export function buildChartRenderModel (
  project: PatternProject,
  options: ChartExportOptions
): ChartRenderModel {
  const { grid, palette } = project
  const margins = options.mode === 'labelled'
    ? labelledMargins
    : { top: 0, right: 0, bottom: 0, left: 0 }
  const minimumLongEdge = options.minimumLongEdge ?? 2000
  const longChartEdge = Math.max(grid.width, grid.height)
  const longMargin = grid.width >= grid.height
    ? margins.left + margins.right
    : margins.top + margins.bottom
  const cellSize = Math.max(
    minimumCellSize,
    Math.ceil((minimumLongEdge - longMargin) / longChartEdge)
  )
  const chartWidth = grid.width * cellSize
  const chartHeight = grid.height * cellSize
  const chartX = margins.left
  const chartY = margins.top
  const counts = countStitches(project)
  const legend = palette.map((entry, paletteIndex) => ({
    paletteIndex,
    name: entry.name,
    color: entry.color,
    symbol: entry.symbol,
    stitches: counts[paletteIndex] ?? 0
  }))
  const legendRows = options.mode === 'labelled' ? Math.ceil(legend.length / 3) : 0
  const canvasWidth = chartWidth + margins.left + margins.right
  const canvasHeight = chartHeight + margins.top + margins.bottom + legendRows * 54
  const cells: ChartExportCell[] = []

  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      const paletteIndex = grid.cells[row * grid.width + column]
      const entry = palette[paletteIndex]
      cells.push({
        column,
        row,
        x: chartX + column * cellSize,
        y: chartY + (grid.height - 1 - row) * cellSize,
        size: cellSize,
        color: entry.color,
        symbol: entry.symbol,
        paletteIndex
      })
    }
  }

  const columnLabels = labelValues(grid.width).map((value) => ({
    value,
    x: chartX + (value - 0.5) * cellSize,
    y: chartY + chartHeight + 38
  }))
  const rowLabels = labelValues(grid.height).map((value) => ({
    value,
    x: chartX - 38,
    y: chartY + chartHeight - (value - 0.5) * cellSize
  }))
  const rowArrows = Array.from({ length: grid.height }, (_, row) => ({
    row,
    direction: getRowDirection(row + 1, project.startingSide),
    x: getRowDirection(row + 1, project.startingSide) === 'right-to-left'
      ? chartX + chartWidth + 24
      : chartX - 24,
    y: chartY + chartHeight - (row + 0.5) * cellSize
  }))

  return {
    mode: options.mode,
    title: project.name,
    dimensions: `${grid.width} × ${grid.height} stitches`,
    canvasWidth,
    canvasHeight,
    chartX,
    chartY,
    chartWidth,
    chartHeight,
    cellSize,
    cells,
    columnLabels,
    rowLabels,
    rowArrows,
    legend
  }
}

export function drawChartRenderModel (
  context: CanvasRenderingContext2D,
  model: ChartRenderModel
) {
  context.fillStyle = colors.paper
  context.fillRect(0, 0, model.canvasWidth, model.canvasHeight)

  if (model.mode === 'labelled') drawHeading(context, model)

  for (const cell of model.cells) {
    context.fillStyle = cell.color
    context.fillRect(cell.x, cell.y, cell.size, cell.size)
    if (cell.size >= 12) {
      context.fillStyle = isDark(cell.color) ? '#ffffff' : colors.ink
      context.font = `600 ${Math.max(8, Math.floor(cell.size * 0.56))}px ui-monospace, monospace`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(cell.symbol, cell.x + cell.size / 2, cell.y + cell.size / 2)
    }
  }

  drawGrid(context, model)
  if (model.mode === 'labelled') {
    drawLabels(context, model)
    drawLegend(context, model)
  }
}

function drawHeading (context: CanvasRenderingContext2D, model: ChartRenderModel) {
  context.fillStyle = colors.ink
  context.font = '700 42px system-ui, sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillText(model.title, model.chartX, 58)
  context.fillStyle = colors.muted
  context.font = '24px ui-monospace, monospace'
  context.fillText(model.dimensions, model.chartX, 98)
}

function drawGrid (context: CanvasRenderingContext2D, model: ChartRenderModel) {
  for (let column = 0; column <= Math.round(model.chartWidth / model.cellSize); column += 1) {
    const x = model.chartX + column * model.cellSize
    context.strokeStyle = column % 5 === 0 ? colors.guide : colors.grid
    context.lineWidth = column % 5 === 0 ? 2 : 1
    context.beginPath()
    context.moveTo(x, model.chartY)
    context.lineTo(x, model.chartY + model.chartHeight)
    context.stroke()
  }
  for (let row = 0; row <= Math.round(model.chartHeight / model.cellSize); row += 1) {
    const y = model.chartY + row * model.cellSize
    context.strokeStyle = row % 5 === 0 ? colors.guide : colors.grid
    context.lineWidth = row % 5 === 0 ? 2 : 1
    context.beginPath()
    context.moveTo(model.chartX, y)
    context.lineTo(model.chartX + model.chartWidth, y)
    context.stroke()
  }
}

function drawLabels (context: CanvasRenderingContext2D, model: ChartRenderModel) {
  context.fillStyle = colors.ink
  context.font = '22px ui-monospace, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (const label of model.columnLabels) context.fillText(String(label.value), label.x, label.y)
  for (const label of model.rowLabels) context.fillText(String(label.value), label.x, label.y)

  context.font = '700 18px ui-monospace, monospace'
  for (const arrow of model.rowArrows) {
    context.textAlign = arrow.direction === 'right-to-left' ? 'left' : 'right'
    context.fillText(arrow.direction === 'right-to-left' ? '←' : '→', arrow.x, arrow.y)
  }
}

function drawLegend (context: CanvasRenderingContext2D, model: ChartRenderModel) {
  const top = model.chartY + model.chartHeight + 92
  const columnWidth = model.canvasWidth / 3
  context.textAlign = 'left'
  context.textBaseline = 'middle'

  model.legend.forEach((entry, index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    const x = column * columnWidth + 24
    const y = top + row * 54
    context.fillStyle = entry.color
    context.fillRect(x, y, 34, 34)
    context.strokeStyle = colors.ink
    context.lineWidth = 1
    context.strokeRect(x, y, 34, 34)
    context.fillStyle = isDark(entry.color) ? '#ffffff' : colors.ink
    context.font = '700 18px ui-monospace, monospace'
    context.textAlign = 'center'
    context.fillText(entry.symbol, x + 17, y + 18)
    context.fillStyle = colors.ink
    context.font = '600 18px system-ui, sans-serif'
    context.textAlign = 'left'
    context.fillText(entry.name, x + 46, y + 12)
    context.fillStyle = colors.muted
    context.font = '15px ui-monospace, monospace'
    context.fillText(`${entry.stitches} stitches`, x + 46, y + 31)
  })
}

function labelValues (length: number) {
  const values = [1]
  for (let value = 5; value <= length; value += 5) values.push(value)
  if (values.at(-1) !== length) values.push(length)
  return [...new Set(values)]
}

function countStitches (project: PatternProject) {
  const counts = new Array<number>(project.palette.length).fill(0)
  for (const paletteIndex of project.grid.cells) counts[paletteIndex] += 1
  return counts
}

function isDark (hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return (red * 299 + green * 587 + blue * 114) / 1000 < 140
}
