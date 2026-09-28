import type { PaletteEntry, PatternGrid, PatternWarning } from '@/features/pattern/model/types'

export const analysisThresholds = {
  maxChangeShare: 0.4,
  maxRowColors: 4,
  minContrastRatio: 1.25,
  maxDetailCells: 2,
  largeChartCells: 40_000
} as const

export function analysePattern (
  grid: PatternGrid,
  palette: PaletteEntry[],
  backgroundIndex = 0
): PatternWarning[] {
  const smallDetails = findSmallDetails(grid, backgroundIndex)
  const detailCells = new Set(smallDetails.flat())

  const warnings = [
    ...findIsolatedCells(grid, palette, detailCells),
    ...findRowWarnings(grid),
    ...findSimilarColors(grid, palette),
    ...smallDetails.map((cells) => smallDetailWarning(grid, cells)),
    ...findLargeChart(grid)
  ]

  return warnings.sort(compareWarnings)
}

// WCAG 2.x contrast ratio between two #rrggbb colours
export function contrastRatio (first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function findIsolatedCells (
  grid: PatternGrid,
  palette: PaletteEntry[],
  skip: Set<number>
): PatternWarning[] {
  const warnings: PatternWarning[] = []

  for (let index = 0; index < grid.cells.length; index += 1) {
    if (skip.has(index)) continue
    if (neighbours(grid, index).some((neighbour) => grid.cells[neighbour] === grid.cells[index])) continue
    // A 1 × 1 chart has nothing to compare against
    if (grid.cells.length === 1) continue

    const row = rowNumber(grid, index)
    const name = palette[grid.cells[index]]?.name ?? 'This colour'
    warnings.push({
      id: `isolated-cell:${index}`,
      type: 'isolated-cell',
      severity: 'info',
      message: `${name} is a single stitch on row ${row}, stitch ${index % grid.width + 1}. Paint it to match a neighbour or run the cleanup to avoid an extra colour change.`,
      rows: [row],
      cellIndices: [index]
    })
  }

  return warnings
}

function findRowWarnings (grid: PatternGrid): PatternWarning[] {
  const warnings: PatternWarning[] = []

  for (let rowIndex = 0; rowIndex < grid.height; rowIndex += 1) {
    const offset = rowIndex * grid.width
    const colours = new Set<number>()
    let changes = 0

    for (let column = 0; column < grid.width; column += 1) {
      colours.add(grid.cells[offset + column])
      if (column > 0 && grid.cells[offset + column] !== grid.cells[offset + column - 1]) changes += 1
    }

    const row = rowIndex + 1
    const transitions = grid.width - 1
    if (transitions > 0 && changes / transitions > analysisThresholds.maxChangeShare) {
      warnings.push({
        id: `many-changes:${row}`,
        type: 'many-changes',
        severity: 'warning',
        message: `Row ${row} changes colour ${changes} times across ${grid.width} stitches. Increase the grid size, merge colours or simplify this row so it is easier to carry yarn.`,
        rows: [row],
        cellIndices: []
      })
    }
    if (colours.size > analysisThresholds.maxRowColors) {
      warnings.push({
        id: `many-row-colors:${row}`,
        type: 'many-row-colors',
        severity: 'warning',
        message: `Row ${row} uses ${colours.size} colours. Carrying more than ${analysisThresholds.maxRowColors} yarns in one row is hard; merge similar colours or repaint small areas.`,
        rows: [row],
        cellIndices: []
      })
    }
  }

  return warnings
}

function findSimilarColors (grid: PatternGrid, palette: PaletteEntry[]): PatternWarning[] {
  const used = new Set(grid.cells)
  const warnings: PatternWarning[] = []

  for (let first = 0; first < palette.length; first += 1) {
    for (let second = first + 1; second < palette.length; second += 1) {
      if (!used.has(first) || !used.has(second)) continue
      if (contrastRatio(palette[first].color, palette[second].color) >= analysisThresholds.minContrastRatio) continue

      warnings.push({
        id: `similar-colors:${first}-${second}`,
        type: 'similar-colors',
        severity: 'warning',
        message: `${palette[first].name} and ${palette[second].name} look almost the same. Replace one with the other or choose yarns with more contrast.`,
        rows: [],
        cellIndices: []
      })
    }
  }

  return warnings
}

// Connected shapes of non-background stitches, regardless of their colours
function findSmallDetails (grid: PatternGrid, backgroundIndex: number) {
  const visited = new Uint8Array(grid.cells.length)
  const details: number[][] = []

  for (let start = 0; start < grid.cells.length; start += 1) {
    if (visited[start] === 1 || grid.cells[start] === backgroundIndex) continue

    const component: number[] = []
    const queue = [start]
    visited[start] = 1
    let cursor = 0

    while (cursor < queue.length) {
      const index = queue[cursor]
      cursor += 1
      if (component.length <= analysisThresholds.maxDetailCells) component.push(index)

      for (const neighbour of neighbours(grid, index)) {
        if (visited[neighbour] === 1 || grid.cells[neighbour] === backgroundIndex) continue
        visited[neighbour] = 1
        queue.push(neighbour)
      }
    }

    if (queue.length <= analysisThresholds.maxDetailCells) details.push(component.sort((a, b) => a - b))
  }

  return details
}

function smallDetailWarning (grid: PatternGrid, cells: number[]): PatternWarning {
  const rows = [...new Set(cells.map((index) => rowNumber(grid, index)))].sort((a, b) => a - b)
  const size = cells.length === 1 ? '1 stitch' : `${cells.length} stitches`

  return {
    id: `small-detail:${cells.join('-')}`,
    type: 'small-detail',
    severity: 'info',
    message: `A ${size} detail on row ${rows.join(' and ')} may disappear once crocheted. Increase the grid size to keep it, or paint it out.`,
    rows,
    cellIndices: cells
  }
}

function findLargeChart (grid: PatternGrid): PatternWarning[] {
  const total = grid.width * grid.height
  if (total <= analysisThresholds.largeChartCells) return []

  return [{
    id: 'large-chart',
    type: 'large-chart',
    severity: 'warning',
    message: `This chart has ${total.toLocaleString('en')} stitches, which may be slow to edit on this device. Reduce the stitches or rows if editing feels sluggish.`,
    rows: [],
    cellIndices: []
  }]
}

function neighbours (grid: PatternGrid, index: number) {
  const column = index % grid.width
  const result: number[] = []
  if (column > 0) result.push(index - 1)
  if (column < grid.width - 1) result.push(index + 1)
  if (index >= grid.width) result.push(index - grid.width)
  if (index + grid.width < grid.cells.length) result.push(index + grid.width)
  return result
}

function rowNumber (grid: PatternGrid, index: number) {
  return Math.floor(index / grid.width) + 1
}

function compareWarnings (first: PatternWarning, second: PatternWarning) {
  return (first.rows[0] ?? 0) - (second.rows[0] ?? 0) ||
    first.type.localeCompare(second.type) ||
    (first.cellIndices[0] ?? 0) - (second.cellIndices[0] ?? 0) ||
    first.id.localeCompare(second.id)
}

function luminance (hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
