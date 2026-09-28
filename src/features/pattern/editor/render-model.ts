import type { PaletteEntry, PatternGrid } from '@/features/pattern/model/types'
import { maxZoom, minZoom, type ChartView, type ChartViewport } from './editor-state'

export interface ChartLayout {
  cellSize: number
  originX: number
  originY: number
  width: number
  height: number
}

export interface ChartDrawInput {
  grid: PatternGrid
  palette: PaletteEntry[]
  layout: ChartLayout
  view: ChartView
  showSymbols: boolean
  cursor?: { column: number, row: number }
  highlightRow?: number
  rowOpacity?: (row: number) => number
}

const guideEvery = 5
const colors = {
  surface: '#e4ddcd',
  line: 'rgba(24, 32, 25, 0.22)',
  guide: 'rgba(24, 32, 25, 0.62)',
  cursor: '#ef6045',
  highlight: '#2946d3'
}

// Row index 0 is crochet row 1, so it is drawn at the bottom of the chart
export function getChartLayout (
  grid: PatternGrid,
  container: { width: number, height: number },
  viewport: ChartViewport
): ChartLayout {
  const baseCell = Math.min(container.width / grid.width, container.height / grid.height)
  const cellSize = Math.max(1, baseCell * viewport.zoom)
  const width = cellSize * grid.width
  const height = cellSize * grid.height

  return {
    cellSize,
    width,
    height,
    originX: (container.width - width) / 2 + viewport.offsetX,
    originY: (container.height - height) / 2 + viewport.offsetY
  }
}

// Zooms while keeping the chart point under `anchor` (relative to the container centre) fixed
export function zoomViewport (
  viewport: ChartViewport,
  nextZoom: number,
  anchor: { x: number, y: number }
): ChartViewport {
  const zoom = Math.min(maxZoom, Math.max(minZoom, nextZoom))
  const ratio = zoom / viewport.zoom
  return {
    zoom,
    offsetX: anchor.x - (anchor.x - viewport.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - viewport.offsetY) * ratio
  }
}

export function pointToCell (grid: PatternGrid, layout: ChartLayout, x: number, y: number) {
  const column = Math.floor((x - layout.originX) / layout.cellSize)
  const visualRow = Math.floor((y - layout.originY) / layout.cellSize)
  if (column < 0 || column >= grid.width || visualRow < 0 || visualRow >= grid.height) return null
  return { column, row: grid.height - 1 - visualRow }
}

export function cellRect (grid: PatternGrid, layout: ChartLayout, column: number, row: number) {
  return {
    x: layout.originX + column * layout.cellSize,
    y: layout.originY + (grid.height - 1 - row) * layout.cellSize,
    size: layout.cellSize
  }
}

export function drawChart (
  context: CanvasRenderingContext2D,
  canvasSize: { width: number, height: number },
  input: ChartDrawInput
) {
  const { grid, palette, layout } = input
  const size = layout.cellSize
  context.clearRect(0, 0, canvasSize.width, canvasSize.height)

  const firstColumn = Math.max(0, Math.floor(-layout.originX / size))
  const lastColumn = Math.min(grid.width - 1, Math.ceil((canvasSize.width - layout.originX) / size))
  const firstVisual = Math.max(0, Math.floor(-layout.originY / size))
  const lastVisual = Math.min(grid.height - 1, Math.ceil((canvasSize.height - layout.originY) / size))

  for (let visual = firstVisual; visual <= lastVisual; visual += 1) {
    const row = grid.height - 1 - visual
    context.globalAlpha = input.rowOpacity?.(row) ?? 1

    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const entry = palette[grid.cells[row * grid.width + column]]
      const x = layout.originX + column * size
      const y = layout.originY + visual * size
      if (input.view === 'crochet') drawStitch(context, x, y, size, entry.color, !input.showSymbols)
      else {
        context.fillStyle = entry.color
        context.fillRect(x, y, size, size)
      }
      if (input.showSymbols && size >= 10) drawSymbol(context, x, y, size, entry)
    }
  }

  context.globalAlpha = 1
  if (input.view === 'grid' && size >= 4) drawGridLines(context, grid, layout)
  if (input.highlightRow !== undefined) {
    const rect = cellRect(grid, layout, 0, input.highlightRow)
    context.strokeStyle = colors.highlight
    context.lineWidth = Math.max(2, size * 0.08)
    context.strokeRect(rect.x, rect.y, layout.width, size)
  }
  if (input.cursor) {
    const rect = cellRect(grid, layout, input.cursor.column, input.cursor.row)
    context.strokeStyle = colors.cursor
    context.lineWidth = 2
    context.strokeRect(rect.x + 1, rect.y + 1, size - 2, size - 2)
  }
}

function drawGridLines (context: CanvasRenderingContext2D, grid: PatternGrid, layout: ChartLayout) {
  const size = layout.cellSize

  for (let column = 0; column <= grid.width; column += 1) {
    const x = Math.round(layout.originX + column * size) + 0.5
    context.strokeStyle = column % guideEvery === 0 ? colors.guide : colors.line
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(x, layout.originY)
    context.lineTo(x, layout.originY + layout.height)
    context.stroke()
  }

  // Guides count rows from the bottom, matching crochet row numbers
  for (let row = 0; row <= grid.height; row += 1) {
    const y = Math.round(layout.originY + layout.height - row * size) + 0.5
    context.strokeStyle = row % guideEvery === 0 ? colors.guide : colors.line
    context.beginPath()
    context.moveTo(layout.originX, y)
    context.lineTo(layout.originX + layout.width, y)
    context.stroke()
  }
}

// Approximates a single-crochet "V": a rounded stitch on a slightly darker bed
function drawStitch (context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, showV: boolean) {
  context.fillStyle = colors.surface
  context.fillRect(x, y, size, size)
  context.fillStyle = color
  context.beginPath()
  context.roundRect(x + size * 0.06, y + size * 0.1, size * 0.88, size * 0.8, size * 0.32)
  context.fill()
  if (!showV || size < 8) return

  context.strokeStyle = isDark(color) ? 'rgba(255, 255, 255, 0.28)' : 'rgba(24, 32, 25, 0.25)'
  context.lineWidth = Math.max(1, size * 0.06)
  context.beginPath()
  context.moveTo(x + size * 0.28, y + size * 0.3)
  context.lineTo(x + size * 0.5, y + size * 0.7)
  context.lineTo(x + size * 0.72, y + size * 0.3)
  context.stroke()
}

function drawSymbol (context: CanvasRenderingContext2D, x: number, y: number, size: number, entry: PaletteEntry) {
  context.fillStyle = isDark(entry.color) ? '#ffffff' : '#182019'
  context.font = `${Math.round(size * 0.62)}px ui-monospace, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(entry.symbol, x + size / 2, y + size / 2 + size * 0.04)
}

export function isDark (hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return (red * 299 + green * 587 + blue * 114) / 1000 < 140
}
