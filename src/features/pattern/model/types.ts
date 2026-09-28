export type Handedness = 'right' | 'left'
export type StartingSide = 'right' | 'left'
export type RowDirection = 'right-to-left' | 'left-to-right'
export type WorkSide = 'right-side' | 'wrong-side'

export interface PaletteEntry {
  id: string
  name: string
  color: string
  symbol: string
}

export interface PatternGrid {
  width: number
  height: number
  cells: Uint8Array
}

export interface RowRun {
  paletteIndex: number
  count: number
}

export interface CropSettings {
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

export interface ImagePreparation {
  crop: CropSettings
  brightness: number
  contrast: number
  maxColors: number
  removeSpeckles: boolean
}

export interface PatternProject {
  id: string
  schemaVersion: 1
  name: string
  createdAt: string
  updatedAt: string
  preparedImage: Blob
  imagePreparation: ImagePreparation
  grid: PatternGrid
  palette: PaletteEntry[]
  backgroundPaletteIndex: 0
  handedness: Handedness
  startingSide: StartingSide
  isMirrored: boolean
  currentRow: number
  completedRows: number[]
}

export type PatternWarningType =
  | 'isolated-cell'
  | 'many-changes'
  | 'many-row-colors'
  | 'similar-colors'
  | 'small-detail'
  | 'large-chart'

export interface PatternWarning {
  id: string
  type: PatternWarningType
  severity: 'info' | 'warning'
  message: string
  // Crochet row numbers, counted from 1 at the bottom
  rows: number[]
  cellIndices: number[]
}
