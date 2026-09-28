import type { PatternGrid } from '@/features/pattern/model/types'

export interface GridPatch {
  indices: Uint32Array
  before: Uint8Array
  after: Uint8Array
}

export interface GridOperationResult {
  grid: PatternGrid
  patch: GridPatch
}

export function paintCell (
  grid: PatternGrid,
  column: number,
  row: number,
  paletteIndex: number
): GridOperationResult {
  const index = getCellIndex(grid, column, row)
  return changeCells(grid, [index], paletteIndex)
}

export function floodFill (
  grid: PatternGrid,
  column: number,
  row: number,
  paletteIndex: number
): GridOperationResult {
  const startIndex = getCellIndex(grid, column, row)
  const sourceIndex = grid.cells[startIndex]

  if (sourceIndex === paletteIndex) {
    return changeCells(grid, [], paletteIndex)
  }

  const queue = [startIndex]
  const visited = new Uint8Array(grid.cells.length)
  const indices: number[] = []
  let cursor = 0

  while (cursor < queue.length) {
    const index = queue[cursor]
    cursor += 1

    if (visited[index] === 1) continue
    visited[index] = 1
    if (grid.cells[index] !== sourceIndex) continue

    indices.push(index)
    const currentColumn = index % grid.width
    const currentRow = Math.floor(index / grid.width)

    if (currentColumn > 0) queue.push(index - 1)
    if (currentColumn < grid.width - 1) queue.push(index + 1)
    if (currentRow > 0) queue.push(index - grid.width)
    if (currentRow < grid.height - 1) queue.push(index + grid.width)
  }

  return changeCells(grid, indices, paletteIndex)
}

export function replacePaletteIndex (
  grid: PatternGrid,
  sourceIndex: number,
  replacementIndex: number
): GridOperationResult {
  const indices: number[] = []

  for (let index = 0; index < grid.cells.length; index += 1) {
    if (grid.cells[index] === sourceIndex) indices.push(index)
  }

  return changeCells(grid, indices, replacementIndex)
}

export function mirrorGrid (grid: PatternGrid): PatternGrid {
  const cells = new Uint8Array(grid.cells.length)

  for (let row = 0; row < grid.height; row += 1) {
    const rowOffset = row * grid.width

    for (let column = 0; column < grid.width; column += 1) {
      cells[rowOffset + column] = grid.cells[rowOffset + grid.width - column - 1]
    }
  }

  return { ...grid, cells }
}

export function applyPatch (
  grid: PatternGrid,
  patch: GridPatch,
  value: 'before' | 'after'
): PatternGrid {
  const cells = grid.cells.slice()
  const values = patch[value]

  for (let offset = 0; offset < patch.indices.length; offset += 1) {
    cells[patch.indices[offset]] = values[offset]
  }

  return { ...grid, cells }
}

function getCellIndex (grid: PatternGrid, column: number, row: number) {
  if (column < 0 || column >= grid.width || row < 0 || row >= grid.height) {
    throw new RangeError(`Cell (${column}, ${row}) is outside this chart`)
  }

  return row * grid.width + column
}

function changeCells (
  grid: PatternGrid,
  indices: number[],
  paletteIndex: number
): GridOperationResult {
  const cells = grid.cells.slice()
  const before = new Uint8Array(indices.length)
  const after = new Uint8Array(indices.length)

  for (let offset = 0; offset < indices.length; offset += 1) {
    const index = indices[offset]
    before[offset] = cells[index]
    after[offset] = paletteIndex
    cells[index] = paletteIndex
  }

  return {
    grid: { ...grid, cells },
    patch: {
      indices: Uint32Array.from(indices),
      before,
      after
    }
  }
}
