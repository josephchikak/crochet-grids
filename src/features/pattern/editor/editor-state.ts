import {
  createGridHistory,
  recordPatch,
  redo,
  undo,
  type GridHistory
} from '@/features/pattern/grid/history'
import {
  floodFill,
  mirrorGrid,
  paintCell,
  replacePaletteIndex,
  type GridPatch
} from '@/features/pattern/grid/operations'
import type { PaletteEntry, PatternGrid, PatternProject } from '@/features/pattern/model/types'

export type EditorTool = 'pencil' | 'fill' | 'picker' | 'erase' | 'pan'
export type ChartView = 'grid' | 'crochet'

export interface ChartViewport {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface EditorState {
  project: PatternProject
  history: GridHistory
  // Mirror patches toggle isMirrored when undone or redone
  mirrorPatches: WeakSet<GridPatch>
  tool: EditorTool
  activeColor: number
  view: ChartView
  showSymbols: boolean
  viewport: ChartViewport
  cursor: { column: number, row: number }
  // Grid row index emphasised after choosing a pattern check
  highlightRow?: number
  stroke?: Map<number, number>
}

export type EditorAction =
  | { type: 'select-tool', tool: EditorTool }
  | { type: 'select-color', paletteIndex: number }
  | { type: 'apply-tool', column: number, row: number }
  | { type: 'stroke-start' }
  | { type: 'stroke-cell', column: number, row: number }
  | { type: 'stroke-end' }
  | { type: 'stroke-cancel' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'mirror' }
  | { type: 'replace-color', source: number, replacement: number }
  | { type: 'update-palette', paletteIndex: number, changes: Partial<Omit<PaletteEntry, 'id'>> }
  | { type: 'set-view', view: ChartView }
  | { type: 'toggle-symbols' }
  | { type: 'set-viewport', viewport: ChartViewport }
  | { type: 'move-cursor', columnDelta: number, rowDelta: number }
  | { type: 'focus-row', rowNumber: number, cellIndex?: number }
  | { type: 'set-progress', currentRow: number, completedRows: number[] }

export const minZoom = 1
export const maxZoom = 12

export function createEditorState (project: PatternProject): EditorState {
  return {
    project,
    history: createGridHistory(),
    mirrorPatches: new WeakSet(),
    tool: 'pencil',
    activeColor: project.palette.length > 1 ? 1 : 0,
    view: 'grid',
    showSymbols: false,
    viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
    cursor: { column: 0, row: 0 }
  }
}

export function editorReducer (state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select-tool':
      return { ...state, tool: action.tool }
    case 'select-color':
      if (!isPaletteIndex(state, action.paletteIndex)) return state
      return { ...state, activeColor: action.paletteIndex }
    case 'apply-tool':
      return { ...applyTool(state, action.column, action.row), highlightRow: undefined }
    case 'stroke-start':
      return { ...state, stroke: new Map(), highlightRow: undefined }
    case 'stroke-cell':
      return paintStrokeCell(state, action.column, action.row)
    case 'stroke-end':
      return endStroke(state)
    case 'stroke-cancel':
      return cancelStroke(state)
    case 'undo':
      return stepHistory(state, 'undo')
    case 'redo':
      return stepHistory(state, 'redo')
    case 'mirror':
      return mirror(state)
    case 'replace-color':
      if (!isPaletteIndex(state, action.source) || !isPaletteIndex(state, action.replacement)) return state
      if (action.source === action.replacement) return state
      return commitPatch(state, replacePaletteIndex(state.project.grid, action.source, action.replacement))
    case 'update-palette':
      return updatePalette(state, action.paletteIndex, action.changes)
    case 'set-view':
      return { ...state, view: action.view }
    case 'toggle-symbols':
      return { ...state, showSymbols: !state.showSymbols }
    case 'set-viewport':
      return { ...state, viewport: clampViewport(action.viewport) }
    case 'move-cursor':
      return moveCursor(state, action.columnDelta, action.rowDelta)
    case 'focus-row':
      return focusRow(state, action.rowNumber, action.cellIndex)
    case 'set-progress':
      // Progress is saved with the project but is not an undoable chart edit
      return {
        ...state,
        project: touch({ ...state.project, currentRow: action.currentRow, completedRows: action.completedRows })
      }
  }
}

export function getStrokeColor (state: EditorState) {
  return state.tool === 'erase' ? state.project.backgroundPaletteIndex : state.activeColor
}

export function isStrokeTool (tool: EditorTool) {
  return tool === 'pencil' || tool === 'erase'
}

function applyTool (state: EditorState, column: number, row: number): EditorState {
  if (!isCell(state.project.grid, column, row)) return state
  const cursor = { column, row }

  switch (state.tool) {
    case 'pencil':
    case 'erase':
      return { ...commitPatch(state, paintCell(state.project.grid, column, row, getStrokeColor(state))), cursor }
    case 'fill':
      return { ...commitPatch(state, floodFill(state.project.grid, column, row, state.activeColor)), cursor }
    case 'picker': {
      const paletteIndex = state.project.grid.cells[row * state.project.grid.width + column]
      return { ...state, activeColor: paletteIndex, tool: 'pencil', cursor }
    }
    case 'pan':
      return { ...state, cursor }
  }
}

function paintStrokeCell (state: EditorState, column: number, row: number): EditorState {
  const grid = state.project.grid
  if (!state.stroke || !isCell(grid, column, row)) return state

  const index = row * grid.width + column
  const color = getStrokeColor(state)
  if (grid.cells[index] === color) return state

  const stroke = new Map(state.stroke)
  if (!stroke.has(index)) stroke.set(index, grid.cells[index])

  return {
    ...state,
    stroke,
    cursor: { column, row },
    project: touch({ ...state.project, grid: paintCell(grid, column, row, color).grid })
  }
}

function endStroke (state: EditorState): EditorState {
  if (!state.stroke) return state
  const patch = strokeToPatch(state.stroke, state.project.grid)
  return { ...state, stroke: undefined, history: recordPatch(state.history, patch) }
}

function cancelStroke (state: EditorState): EditorState {
  if (!state.stroke) return state
  if (state.stroke.size === 0) return { ...state, stroke: undefined }

  const cells = state.project.grid.cells.slice()
  for (const [index, before] of state.stroke) cells[index] = before

  return {
    ...state,
    stroke: undefined,
    project: touch({ ...state.project, grid: { ...state.project.grid, cells } })
  }
}

function strokeToPatch (stroke: Map<number, number>, grid: PatternGrid): GridPatch {
  const indices = Uint32Array.from([...stroke.keys()].sort((a, b) => a - b))
  const before = new Uint8Array(indices.length)
  const after = new Uint8Array(indices.length)

  indices.forEach((index, offset) => {
    before[offset] = stroke.get(index) ?? 0
    after[offset] = grid.cells[index]
  })

  return { indices, before, after }
}

function commitPatch (
  state: EditorState,
  result: { grid: PatternGrid, patch: GridPatch }
): EditorState {
  if (result.patch.indices.length === 0) return state

  return {
    ...state,
    history: recordPatch(state.history, result.patch),
    project: touch({ ...state.project, grid: result.grid })
  }
}

function stepHistory (state: EditorState, direction: 'undo' | 'redo'): EditorState {
  if (state.stroke) return state
  const stack = direction === 'undo' ? state.history.undoStack : state.history.redoStack
  const patch = stack.at(-1)
  if (!patch) return state

  const result = direction === 'undo'
    ? undo(state.project.grid, state.history)
    : redo(state.project.grid, state.history)
  const isMirrored = state.mirrorPatches.has(patch)
    ? !state.project.isMirrored
    : state.project.isMirrored

  return {
    ...state,
    history: result.history,
    project: touch({ ...state.project, grid: result.grid, isMirrored })
  }
}

function mirror (state: EditorState): EditorState {
  const grid = state.project.grid
  const mirrored = mirrorGrid(grid)
  const indices: number[] = []

  for (let index = 0; index < grid.cells.length; index += 1) {
    if (grid.cells[index] !== mirrored.cells[index]) indices.push(index)
  }

  const patch: GridPatch = {
    indices: Uint32Array.from(indices),
    before: Uint8Array.from(indices, (index) => grid.cells[index]),
    after: Uint8Array.from(indices, (index) => mirrored.cells[index])
  }
  const project = touch({ ...state.project, grid: mirrored, isMirrored: !state.project.isMirrored })

  // A symmetric motif changes no cells but still flips the saved mirror state
  if (indices.length === 0) return { ...state, project }

  state.mirrorPatches.add(patch)
  return { ...state, project, history: recordPatch(state.history, patch) }
}

function updatePalette (
  state: EditorState,
  paletteIndex: number,
  changes: Partial<Omit<PaletteEntry, 'id'>>
): EditorState {
  if (!isPaletteIndex(state, paletteIndex)) return state

  const palette = state.project.palette.map((entry, index) =>
    index === paletteIndex ? { ...entry, ...changes } : entry
  )
  return { ...state, project: touch({ ...state.project, palette }) }
}

function moveCursor (state: EditorState, columnDelta: number, rowDelta: number): EditorState {
  const { width, height } = state.project.grid
  const column = Math.min(width - 1, Math.max(0, state.cursor.column + columnDelta))
  const row = Math.min(height - 1, Math.max(0, state.cursor.row + rowDelta))
  return { ...state, cursor: { column, row } }
}

function focusRow (state: EditorState, rowNumber: number, cellIndex?: number): EditorState {
  const { width, height } = state.project.grid
  const row = rowNumber - 1
  if (!Number.isInteger(row) || row < 0 || row >= height) return state

  const column = cellIndex !== undefined && Math.floor(cellIndex / width) === row
    ? cellIndex % width
    : state.cursor.column
  return { ...state, cursor: { column, row }, highlightRow: row }
}

function clampViewport (viewport: ChartViewport): ChartViewport {
  return { ...viewport, zoom: Math.min(maxZoom, Math.max(minZoom, viewport.zoom)) }
}

function touch (project: PatternProject): PatternProject {
  return { ...project, updatedAt: new Date().toISOString() }
}

function isCell (grid: PatternGrid, column: number, row: number) {
  return Number.isInteger(column) && Number.isInteger(row) &&
    column >= 0 && column < grid.width && row >= 0 && row < grid.height
}

function isPaletteIndex (state: EditorState, paletteIndex: number) {
  return Number.isInteger(paletteIndex) && paletteIndex >= 0 &&
    paletteIndex < state.project.palette.length
}
