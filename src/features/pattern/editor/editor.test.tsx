import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { PatternProject } from '@/features/pattern/model/types'
import { createEditorState, editorReducer } from './editor-state'
import { getChartLayout, getFollowLayout, pointToCell } from './render-model'
import { PatternEditor } from './pattern-editor'

// 4 stitches × 3 rows; row index 0 is crochet row 1 (bottom)
function createProject (): PatternProject {
  return {
    id: 'project-1',
    schemaVersion: 1,
    name: 'Heart',
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
    grid: {
      width: 4,
      height: 3,
      cells: Uint8Array.from([
        0, 1, 1, 0,
        0, 1, 2, 0,
        0, 0, 0, 0
      ])
    },
    palette: [
      { id: 'color-0', name: 'Natural cotton', color: '#f5efe3', symbol: '□' },
      { id: 'color-1', name: 'Colour 2', color: '#c0392b', symbol: '●' },
      { id: 'color-2', name: 'Colour 3', color: '#182019', symbol: '×' }
    ],
    backgroundPaletteIndex: 0,
    handedness: 'right',
    startingSide: 'right',
    isMirrored: false,
    currentRow: 1,
    completedRows: []
  }
}

type ChangeHandler = Mock<(project: PatternProject) => void>

function lastCells (onChange: ChangeHandler) {
  const project = onChange.mock.lastCall?.[0] as PatternProject
  return Array.from(project.grid.cells)
}

describe('PatternEditor', () => {
  let project: PatternProject
  let onChange: ChangeHandler

  beforeEach(() => {
    project = createProject()
    onChange = vi.fn<(project: PatternProject) => void>()
    vi.stubGlobal('ResizeObserver', class {
      observe () {}
      disconnect () {}
    })
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never
  })

  it('selects a tool and marks it as pressed', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Pencil' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Fill' }))

    expect(screen.getByRole('button', { name: 'Fill' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Pencil' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('paints the focused cell from the keyboard with the active colour', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /use colour 3/i }))
    screen.getByRole('application', { name: /pattern chart/i }).focus()
    await user.keyboard('{Enter}')

    expect(lastCells(onChange)).toEqual([
      2, 1, 1, 0,
      0, 1, 2, 0,
      0, 0, 0, 0
    ])
    expect(Array.from(project.grid.cells)[0]).toBe(0)
  })

  it('fills the connected region under the cursor', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /use colour 2/i }))
    await user.click(screen.getByRole('button', { name: 'Fill' }))
    screen.getByRole('application', { name: /pattern chart/i }).focus()
    await user.keyboard('{Enter}')

    expect(lastCells(onChange)).toEqual([
      1, 1, 1, 1,
      1, 1, 2, 1,
      1, 1, 1, 1
    ])
  })

  it('enables undo and redo only when history exists', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)
    const undoButton = screen.getByRole('button', { name: 'Undo' })
    const redoButton = screen.getByRole('button', { name: 'Redo' })

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /use colour 3/i }))
    screen.getByRole('application', { name: /pattern chart/i }).focus()
    await user.keyboard('{Enter}')
    expect(undoButton).toBeEnabled()

    await user.click(undoButton)
    expect(lastCells(onChange)[0]).toBe(0)
    expect(redoButton).toBeEnabled()

    await user.click(redoButton)
    expect(lastCells(onChange)[0]).toBe(2)
  })

  it('renames yarn without changing its colour identity', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.clear(screen.getByLabelText('Yarn name for colour 1'))
    await user.type(screen.getByLabelText('Yarn name for colour 1'), 'Cream cotton')

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        palette: expect.arrayContaining([
          expect.objectContaining({ name: 'Cream cotton', color: '#f5efe3' })
        ])
      })
    )
  })

  it('shows stitch totals for each palette colour', () => {
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    expect(screen.getByText('8 stitches · 67%')).toBeInTheDocument()
    expect(screen.getByText('3 stitches · 25%')).toBeInTheDocument()
    expect(screen.getByText('1 stitch · 8%')).toBeInTheDocument()
  })

  it('replaces every stitch of one colour with another', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Replace colour 3 with'), 'Colour 2')

    expect(lastCells(onChange)).toEqual([
      0, 1, 1, 0,
      0, 1, 1, 0,
      0, 0, 0, 0
    ])
  })

  it('asks before mirroring and keeps the handedness setting', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Mirror' }))
    const dialog = screen.getByRole('dialog', { name: /mirror the motif/i })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Mirror' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mirror motif' }))

    const mirrored = onChange.mock.lastCall?.[0] as PatternProject
    expect(Array.from(mirrored.grid.cells)).toEqual([
      0, 1, 1, 0,
      0, 2, 1, 0,
      0, 0, 0, 0
    ])
    expect(mirrored.isMirrored).toBe(true)
    expect(mirrored.handedness).toBe('right')
  })

  it('toggles between square grid and crochet preview', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)
    const toggle = screen.getByRole('button', { name: 'Crochet preview' })

    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers labelled PNG and printable PDF exports', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Export chart' }))

    const dialog = screen.getByRole('dialog', { name: 'Export chart' })
    expect(within(dialog).getByRole('button', { name: 'PNG chart only' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'PNG with labels' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: 'Printable PDF' })).toBeEnabled()
  })

  it('lists crochet checks without blocking editing and focuses the affected row', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Pattern checks: 3 suggestions' }))
    expect(screen.getByRole('tab', { name: /checks/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Single stitches')).toBeInTheDocument()
    expect(screen.getByText('Busy rows')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /single stitch on row 2, stitch 3/i }))

    expect(screen.getByRole('application', { name: /cursor at stitch 3, row 2/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pencil' })).toBeEnabled()
  })

  it('updates checks after an edit removes the problem', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Replace colour 3 with'), 'Colour 2')

    expect(await screen.findByRole('button', { name: 'Pattern checks: 2 suggestions' })).toBeInTheDocument()
  })

  it('shows the save status and warns when the chart is not being saved', () => {
    const { rerender } = render(<PatternEditor project={project} onProjectChange={onChange} saveStatus='saving' />)
    expect(screen.getByRole('status')).toHaveTextContent('Saving')

    rerender(<PatternEditor project={project} onProjectChange={onChange} saveStatus='saved' />)
    expect(screen.getByRole('status')).toHaveTextContent('Saved')

    rerender(
      <PatternEditor
        onProjectChange={onChange}
        project={project}
        saveError='This device is out of space for saved charts.'
        saveStatus='failed'
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent('Not saved')
    expect(screen.getByRole('alert')).toHaveTextContent(
      "This chart isn't being saved. This device is out of space for saved charts."
    )
  })

  it('opens follow mode and saves row progress through the project', async () => {
    const user = userEvent.setup()
    render(<PatternEditor project={project} onProjectChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Follow pattern' }))
    expect(screen.getByText('Row 1 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Complete row 1' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ currentRow: 2, completedRows: [1] }))

    await user.click(screen.getByRole('button', { name: 'Back to editor' }))
    expect(screen.queryByText(/row 2 of 3/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})

describe('editorReducer', () => {
  it('batches a pointer stroke into one undoable patch', () => {
    let state = createEditorState(createProject())
    state = editorReducer(state, { type: 'select-color', paletteIndex: 2 })
    state = editorReducer(state, { type: 'stroke-start' })
    state = editorReducer(state, { type: 'stroke-cell', column: 0, row: 2 })
    state = editorReducer(state, { type: 'stroke-cell', column: 1, row: 2 })
    state = editorReducer(state, { type: 'stroke-cell', column: 1, row: 2 })
    state = editorReducer(state, { type: 'stroke-end' })

    expect(state.history.undoStack).toHaveLength(1)
    expect(Array.from(state.history.undoStack[0].indices)).toEqual([8, 9])

    state = editorReducer(state, { type: 'undo' })
    expect(Array.from(state.project.grid.cells)).toEqual(Array.from(createProject().grid.cells))
  })

  it('reverts a stroke interrupted by a second finger', () => {
    let state = createEditorState(createProject())
    state = editorReducer(state, { type: 'stroke-start' })
    state = editorReducer(state, { type: 'stroke-cell', column: 0, row: 0 })
    state = editorReducer(state, { type: 'stroke-cancel' })

    expect(Array.from(state.project.grid.cells)).toEqual(Array.from(createProject().grid.cells))
    expect(state.history.undoStack).toHaveLength(0)
  })

  it('restores mirror state when a mirror is undone', () => {
    let state = createEditorState(createProject())
    state = editorReducer(state, { type: 'mirror' })
    expect(state.project.isMirrored).toBe(true)

    state = editorReducer(state, { type: 'undo' })
    expect(state.project.isMirrored).toBe(false)
    expect(Array.from(state.project.grid.cells)).toEqual(Array.from(createProject().grid.cells))
  })

  it('erases to the background colour', () => {
    let state = createEditorState(createProject())
    state = editorReducer(state, { type: 'select-tool', tool: 'erase' })
    state = editorReducer(state, { type: 'apply-tool', column: 1, row: 0 })

    expect(state.project.grid.cells[1]).toBe(0)
  })

  it('picks the colour under the cursor and returns to the pencil', () => {
    let state = createEditorState(createProject())
    state = editorReducer(state, { type: 'select-tool', tool: 'picker' })
    state = editorReducer(state, { type: 'apply-tool', column: 2, row: 1 })

    expect(state.activeColor).toBe(2)
    expect(state.tool).toBe('pencil')
  })
})

describe('chart render model', () => {
  it('maps canvas points to cells with row 1 at the bottom', () => {
    const grid = createProject().grid
    const layout = getChartLayout(grid, { width: 400, height: 300 }, { zoom: 1, offsetX: 0, offsetY: 0 })

    expect(layout.cellSize).toBe(100)
    expect(pointToCell(grid, layout, 10, 290)).toEqual({ column: 0, row: 0 })
    expect(pointToCell(grid, layout, 390, 10)).toEqual({ column: 3, row: 2 })
    expect(pointToCell(grid, layout, 401, 10)).toBeNull()
  })
})

describe('follow layout', () => {
  it('keeps rows readable and centres the current row', () => {
    const grid = { width: 10, height: 200, cells: new Uint8Array(2000) }
    const layout = getFollowLayout(grid, { width: 400, height: 320 }, 50)

    expect(layout.cellSize).toBe(20)
    const rowTop = layout.originY + (grid.height - 1 - 50) * layout.cellSize
    expect(rowTop + layout.cellSize / 2).toBe(160)
  })

  it('shows small charts whole', () => {
    const grid = { width: 4, height: 3, cells: new Uint8Array(12) }
    expect(getFollowLayout(grid, { width: 400, height: 300 }, 0))
      .toEqual(getChartLayout(grid, { width: 400, height: 300 }, { zoom: 1, offsetX: 0, offsetY: 0 }))
  })
})
