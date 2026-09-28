import type { PaletteEntry, PatternGrid } from '@/features/pattern/model/types'

export interface ConversionRequest {
  id: string
  file: Blob
  width: number
  height: number
  maxColors: number
  background: { name: string, color: string }
  crop: { x: number, y: number, width: number, height: number }
  brightness: number
  contrast: number
  removeSpeckles: boolean
}

export interface ConversionResult {
  grid: PatternGrid
  palette: PaletteEntry[]
  preview: ImageData
}

export type ConversionWorkerMessage =
  | { kind: 'convert', request: ConversionRequest }

export type ConversionWorkerResponse =
  | { kind: 'result', id: string, result: ConversionResult }
  | { kind: 'error', id: string, message: string }
