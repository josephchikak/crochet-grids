import { describe, expect, it } from 'vitest'
import {
  getRowDirection,
  getRowRuns,
  getRowSide
} from './instructions'

describe('flat crochet instructions', () => {
  it('alternates from a right-side start without changing the saved grid', () => {
    expect(getRowDirection(1, 'right')).toBe('right-to-left')
    expect(getRowDirection(2, 'right')).toBe('left-to-right')
    expect(getRowDirection(3, 'right')).toBe('right-to-left')
  })

  it('mirrors directions for a left-side start', () => {
    expect(getRowDirection(1, 'left')).toBe('left-to-right')
    expect(getRowDirection(2, 'left')).toBe('right-to-left')
  })

  it('labels odd rows as the right side and even rows as the wrong side', () => {
    expect(getRowSide(1)).toBe('right-side')
    expect(getRowSide(2)).toBe('wrong-side')
  })

  it('compresses colour runs in the actual working direction', () => {
    const grid = {
      width: 5,
      height: 1,
      cells: Uint8Array.from([0, 0, 1, 1, 1])
    }

    expect(getRowRuns(grid, 1, 'right')).toEqual([
      { paletteIndex: 1, count: 3 },
      { paletteIndex: 0, count: 2 }
    ])
    expect(Array.from(grid.cells)).toEqual([0, 0, 1, 1, 1])
  })

  it('rejects a row outside the grid', () => {
    const grid = {
      width: 2,
      height: 2,
      cells: Uint8Array.from([0, 0, 1, 1])
    }

    expect(() => getRowRuns(grid, 0, 'right')).toThrow('Row 0 is outside this chart')
    expect(() => getRowRuns(grid, 3, 'right')).toThrow('Row 3 is outside this chart')
  })
})
