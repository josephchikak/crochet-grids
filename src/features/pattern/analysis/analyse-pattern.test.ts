import { describe, expect, it } from 'vitest'
import type { PaletteEntry, PatternGrid } from '@/features/pattern/model/types'
import { analysePattern, contrastRatio } from './analyse-pattern'

const palette: PaletteEntry[] = [
  { id: 'color-0', name: 'Cream', color: '#f5efe3', symbol: '□' },
  { id: 'color-1', name: 'Red', color: '#c0392b', symbol: '●' },
  { id: 'color-2', name: 'Navy', color: '#1b2a4a', symbol: '×' },
  { id: 'color-3', name: 'Gold', color: '#e0a526', symbol: '▲' },
  { id: 'color-4', name: 'Green', color: '#2f7d4a', symbol: '◆' },
  { id: 'color-5', name: 'Pink', color: '#f4a3c0', symbol: '+' }
]

function grid (width: number, height: number, cells: number[]): PatternGrid {
  return { width, height, cells: Uint8Array.from(cells) }
}

function ofType (type: string, warnings: ReturnType<typeof analysePattern>) {
  return warnings.filter((warning) => warning.type === type)
}

describe('analysePattern', () => {
  it('returns no warnings for a clean, blocky chart', () => {
    const chart = grid(10, 4, [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ])

    expect(analysePattern(chart, palette)).toEqual([])
  })

  it('flags a stitch with no same-colour neighbour', () => {
    const chart = grid(3, 3, [
      1, 1, 1,
      1, 2, 1,
      1, 1, 1
    ])

    expect(ofType('isolated-cell', analysePattern(chart, palette))).toEqual([
      expect.objectContaining({ id: 'isolated-cell:4', rows: [2], cellIndices: [4], severity: 'info' })
    ])
  })

  it('flags isolated background stitches too', () => {
    const chart = grid(3, 3, [
      1, 1, 1,
      1, 0, 1,
      1, 1, 1
    ])

    expect(ofType('isolated-cell', analysePattern(chart, palette)).map((warning) => warning.id))
      .toEqual(['isolated-cell:4'])
  })

  it('warns when colour changes exceed 40 percent of a row', () => {
    const chart = grid(5, 2, [
      0, 0, 0, 1, 1,
      0, 1, 0, 1, 0
    ])
    const warnings = ofType('many-changes', analysePattern(chart, palette))

    expect(warnings.map((warning) => warning.id)).toEqual(['many-changes:2'])
    expect(warnings[0].rows).toEqual([2])
    expect(warnings[0].message).toMatch(/row 2/i)
  })

  it('warns when a row uses more than four colours', () => {
    const chart = grid(6, 2, [
      0, 0, 1, 1, 2, 2,
      0, 1, 2, 3, 4, 5
    ])
    const warnings = ofType('many-row-colors', analysePattern(chart, palette))

    expect(warnings.map((warning) => warning.id)).toEqual(['many-row-colors:2'])
  })

  it('warns about palette colours that are hard to tell apart', () => {
    const similar: PaletteEntry[] = [
      { id: 'color-0', name: 'White', color: '#ffffff', symbol: '□' },
      { id: 'color-1', name: 'Off-white', color: '#f5f5f5', symbol: '●' },
      { id: 'color-2', name: 'Black', color: '#000000', symbol: '×' }
    ]
    const chart = grid(3, 1, [0, 1, 2])
    const warnings = ofType('similar-colors', analysePattern(chart, similar))

    expect(contrastRatio('#ffffff', '#f5f5f5')).toBeLessThan(1.25)
    expect(warnings.map((warning) => warning.id)).toEqual(['similar-colors:0-1'])
    expect(warnings[0].message).toMatch(/White.*Off-white/)
  })

  it('ignores similar colours that no stitch uses', () => {
    const similar: PaletteEntry[] = [
      { id: 'color-0', name: 'White', color: '#ffffff', symbol: '□' },
      { id: 'color-1', name: 'Off-white', color: '#f5f5f5', symbol: '●' }
    ]

    expect(ofType('similar-colors', analysePattern(grid(2, 1, [0, 0]), similar))).toEqual([])
  })

  it('flags one- and two-stitch details without repeating them as isolated stitches', () => {
    const chart = grid(5, 3, [
      0, 0, 0, 0, 0,
      0, 1, 1, 0, 2,
      0, 0, 0, 0, 0
    ])
    const warnings = analysePattern(chart, palette)

    expect(ofType('small-detail', warnings).map((warning) => warning.id))
      .toEqual(['small-detail:6-7', 'small-detail:9'])
    expect(ofType('isolated-cell', warnings)).toEqual([])
  })

  it('reports large charts once', () => {
    const cells = new Array(201 * 200).fill(0)
    const warnings = analysePattern(grid(201, 200, cells), palette)

    expect(warnings).toEqual([
      expect.objectContaining({ id: 'large-chart', type: 'large-chart', rows: [], cellIndices: [] })
    ])
  })

  it('sorts by first affected row, then type', () => {
    const chart = grid(5, 3, [
      0, 1, 0, 1, 0,
      0, 0, 0, 0, 0,
      1, 1, 1, 1, 2
    ])
    const warnings = analysePattern(chart, palette)

    expect(warnings.map((warning) => warning.id)).toEqual([
      'many-changes:1',
      'small-detail:1',
      'small-detail:3',
      'isolated-cell:14'
    ])
  })
})
