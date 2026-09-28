import { describe, expect, it } from 'vitest'
import {
  floodFill,
  mirrorGrid,
  paintCell,
  replacePaletteIndex
} from './operations'
import {
  createGridHistory,
  recordPatch,
  redo,
  undo
} from './history'

describe('grid operations', () => {
  it('paints one valid cell without mutating the original grid', () => {
    const grid = createGrid(3, 2, [0, 0, 0, 0, 0, 0])
    const result = paintCell(grid, 1, 1, 2)

    expect(Array.from(result.grid.cells)).toEqual([0, 0, 0, 0, 2, 0])
    expect(Array.from(grid.cells)).toEqual([0, 0, 0, 0, 0, 0])
    expect(Array.from(result.patch.indices)).toEqual([4])
  })

  it('fills only the connected source-colour region', () => {
    const grid = createGrid(3, 2, [0, 0, 1, 0, 1, 1])
    const result = floodFill(grid, 0, 0, 2)

    expect(Array.from(result.grid.cells)).toEqual([2, 2, 1, 2, 1, 1])
    expect(Array.from(grid.cells)).toEqual([0, 0, 1, 0, 1, 1])
  })

  it('replaces a palette index across the complete chart', () => {
    const grid = createGrid(4, 1, [0, 1, 0, 2])
    const result = replacePaletteIndex(grid, 0, 3)

    expect(Array.from(result.grid.cells)).toEqual([3, 1, 3, 2])
    expect(Array.from(result.patch.indices)).toEqual([0, 2])
  })

  it('mirrors each row without changing row order', () => {
    const grid = createGrid(3, 2, [0, 1, 2, 3, 4, 5])

    expect(Array.from(mirrorGrid(grid).cells)).toEqual([2, 1, 0, 5, 4, 3])
  })

  it('rejects coordinates outside the chart', () => {
    const grid = createGrid(2, 2, [0, 0, 0, 0])

    expect(() => paintCell(grid, -1, 0, 1)).toThrow('Cell (-1, 0) is outside this chart')
    expect(() => paintCell(grid, 2, 0, 1)).toThrow('Cell (2, 0) is outside this chart')
  })
})

describe('grid history', () => {
  it('undoes and redoes a recorded patch', () => {
    const original = createGrid(2, 1, [0, 0])
    const edit = paintCell(original, 1, 0, 2)
    const recorded = recordPatch(createGridHistory(), edit.patch)
    const undone = undo(edit.grid, recorded)
    const redone = redo(undone.grid, undone.history)

    expect(Array.from(undone.grid.cells)).toEqual([0, 0])
    expect(Array.from(redone.grid.cells)).toEqual([0, 2])
  })

  it('clears redo when a new edit is recorded', () => {
    const original = createGrid(2, 1, [0, 0])
    const first = paintCell(original, 0, 0, 1)
    const afterFirst = recordPatch(createGridHistory(), first.patch)
    const undone = undo(first.grid, afterFirst)
    const second = paintCell(undone.grid, 1, 0, 2)

    expect(recordPatch(undone.history, second.patch).redoStack).toEqual([])
  })

  it('retains only the configured number of undo operations', () => {
    let history = createGridHistory(2)
    const grid = createGrid(1, 1, [0])

    history = recordPatch(history, paintCell(grid, 0, 0, 1).patch)
    history = recordPatch(history, paintCell(grid, 0, 0, 2).patch)
    history = recordPatch(history, paintCell(grid, 0, 0, 3).patch)

    expect(history.undoStack).toHaveLength(2)
  })
})

function createGrid (width: number, height: number, cells: number[]) {
  return {
    width,
    height,
    cells: Uint8Array.from(cells)
  }
}
