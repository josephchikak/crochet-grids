import type { PatternGrid } from '@/features/pattern/model/types'
import { applyPatch, type GridPatch } from './operations'

export interface GridHistory {
  undoStack: GridPatch[]
  redoStack: GridPatch[]
  limit: number
}

export interface GridHistoryResult {
  grid: PatternGrid
  history: GridHistory
}

export function createGridHistory (limit = 100): GridHistory {
  return { undoStack: [], redoStack: [], limit }
}

export function recordPatch (history: GridHistory, patch: GridPatch): GridHistory {
  if (patch.indices.length === 0) return history

  return {
    ...history,
    undoStack: [...history.undoStack, patch].slice(-history.limit),
    redoStack: []
  }
}

export function undo (grid: PatternGrid, history: GridHistory): GridHistoryResult {
  const patch = history.undoStack.at(-1)
  if (!patch) return { grid, history }

  return {
    grid: applyPatch(grid, patch, 'before'),
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, patch]
    }
  }
}

export function redo (grid: PatternGrid, history: GridHistory): GridHistoryResult {
  const patch = history.redoStack.at(-1)
  if (!patch) return { grid, history }

  return {
    grid: applyPatch(grid, patch, 'after'),
    history: {
      ...history,
      undoStack: [...history.undoStack, patch].slice(-history.limit),
      redoStack: history.redoStack.slice(0, -1)
    }
  }
}
