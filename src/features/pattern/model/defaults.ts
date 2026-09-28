import type { Handedness, StartingSide } from './types'

export const patternLimits = {
  maxFileBytes: 20 * 1024 * 1024,
  maxSourceEdge: 4096,
  minDimension: 1,
  maxDimension: 250,
  minColors: 2,
  maxColors: 12
} as const

export const defaultPatternSettings: {
  width: number
  height: number
  maxColors: number
  backgroundName: string
  backgroundColor: string
  handedness: Handedness
  startingSide: StartingSide
} = {
  width: 60,
  height: 60,
  maxColors: 4,
  backgroundName: 'Natural cotton',
  backgroundColor: '#f1ebdd',
  handedness: 'right',
  startingSide: 'right'
}
