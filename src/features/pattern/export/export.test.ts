import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PatternProject } from '@/features/pattern/model/types'
import { safeExportFilename } from '@/lib/download'
import { buildPdfModel, exportPdf } from './pdf-export'
import { exportPng } from './png-export'
import { buildChartRenderModel } from './render-chart'

function createProject (width = 10, height = 10): PatternProject {
  const cells = new Uint8Array(width * height)
  for (let index = 0; index < cells.length; index += 1) cells[index] = index % 3

  return {
    id: 'project-1',
    schemaVersion: 1,
    name: 'Summer Heart',
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    preparedImage: new Blob(),
    imagePreparation: {
      crop: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      brightness: 0,
      contrast: 0,
      maxColors: 3,
      removeSpeckles: true
    },
    grid: { width, height, cells },
    palette: [
      { id: 'color-0', name: 'Natural cotton', color: '#f5efe3', symbol: '□' },
      { id: 'color-1', name: 'Poppy red', color: '#c0392b', symbol: '●' },
      { id: 'color-2', name: 'Ink', color: '#182019', symbol: '×' }
    ],
    backgroundPaletteIndex: 0,
    handedness: 'right',
    startingSide: 'right',
    isMirrored: false,
    currentRow: 1,
    completedRows: []
  }
}

function createCanvasContext () {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn()
  } as unknown as CanvasRenderingContext2D
}

function projectSnapshot (project: PatternProject) {
  return {
    ...project,
    preparedImage: project.preparedImage,
    imagePreparation: structuredClone(project.imagePreparation),
    grid: { ...project.grid, cells: Array.from(project.grid.cells) },
    palette: structuredClone(project.palette),
    completedRows: [...project.completedRows]
  }
}

describe('chart export layout', () => {
  it('lays out labels, symbols, arrows and the legend from one chart model', () => {
    const model = buildChartRenderModel(createProject(), { mode: 'labelled' })

    expect(Math.max(model.canvasWidth, model.canvasHeight)).toBeGreaterThanOrEqual(2000)
    expect(model.columnLabels.map((label) => label.value)).toEqual([1, 5, 10])
    expect(model.rowLabels.map((label) => label.value)).toEqual([1, 5, 10])
    expect(model.cells[0]).toMatchObject({ column: 0, row: 0, symbol: '□' })
    expect(model.cells[0].y).toBeGreaterThan(model.cells.at(-1)?.y ?? 0)
    expect(model.rowArrows).toHaveLength(10)
    expect(model.rowArrows[0].direction).toBe('right-to-left')
    expect(model.legend.map((entry) => entry.name)).toEqual([
      'Natural cotton',
      'Poppy red',
      'Ink'
    ])
  })

  it('creates safe deterministic download names from user-entered project names', () => {
    expect(safeExportFilename('  My <Logo>/Summer  ', 'png'))
      .toBe('crochet-chart-my-logo-summer.png')
    expect(safeExportFilename('***', 'pdf')).toBe('crochet-chart-untitled.pdf')
  })
})

describe('PNG export', () => {
  let exportedCanvas: HTMLCanvasElement

  beforeEach(() => {
    const createElement = document.createElement.bind(document)
    exportedCanvas = createElement('canvas')
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) =>
      tagName === 'canvas' ? exportedCanvas : createElement(tagName, options))
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createCanvasContext()) as never
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
      callback(new Blob(['png'], { type: 'image/png' }))
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('returns a high-resolution PNG without changing the project', async () => {
    const project = createProject()
    const before = projectSnapshot(project)
    const blob = await exportPng(project, { mode: 'labelled' })

    expect(blob.type).toBe('image/png')
    expect(projectSnapshot(project)).toEqual(before)
    expect(Math.max(exportedCanvas.width, exportedCanvas.height)).toBeGreaterThanOrEqual(2000)
  })
})

describe('PDF export', () => {
  it('includes the legend, written colour runs and tiled chart pages', () => {
    const project = createProject(250, 250)
    const model = buildPdfModel(project, { includeWrittenRows: true })

    expect(model.legend.map((entry) => entry.name)).toContain('Poppy red')
    expect(model.writtenRows[0]).toContain('Row 1 · Right to left · Right side')
    expect(model.writtenRows[0]).toContain('Poppy red')
    expect(model.tiles.length).toBeGreaterThan(1)
    expect(model.tiles.every((tile) => tile.cellSizeMm >= 3)).toBe(true)
    expect(model.tiles[0].label).toMatch(/^Page column 1 of \d+ · rows 1-\d+$/)
  })

  it('creates a real PDF blob without mutating the project', async () => {
    const project = createProject()
    const before = projectSnapshot(project)
    const blob = await exportPdf(project, { includeWrittenRows: true })
    const header = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 4))

    expect(blob.type).toBe('application/pdf')
    expect(header).toBe('%PDF')
    expect(projectSnapshot(project)).toEqual(before)
  })
})
