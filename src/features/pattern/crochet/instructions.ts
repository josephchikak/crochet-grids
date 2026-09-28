import type {
  PatternGrid,
  RowDirection,
  RowRun,
  StartingSide,
  WorkSide
} from '@/features/pattern/model/types'

export function getRowDirection (
  rowNumber: number,
  startingSide: StartingSide
): RowDirection {
  const startsOnRight = startingSide === 'right'
  const isOddRow = rowNumber % 2 === 1

  return startsOnRight === isOddRow ? 'right-to-left' : 'left-to-right'
}

export function getRowSide (rowNumber: number): WorkSide {
  return rowNumber % 2 === 1 ? 'right-side' : 'wrong-side'
}

export function getRowRuns (
  grid: PatternGrid,
  rowNumber: number,
  startingSide: StartingSide
): RowRun[] {
  if (rowNumber < 1 || rowNumber > grid.height) {
    throw new RangeError(`Row ${rowNumber} is outside this chart`)
  }

  const rowOffset = (rowNumber - 1) * grid.width
  const direction = getRowDirection(rowNumber, startingSide)
  const runs: RowRun[] = []

  for (let step = 0; step < grid.width; step += 1) {
    const column = direction === 'right-to-left'
      ? grid.width - step - 1
      : step
    const paletteIndex = grid.cells[rowOffset + column]
    const currentRun = runs.at(-1)

    if (currentRun?.paletteIndex === paletteIndex) {
      currentRun.count += 1
    } else {
      runs.push({ paletteIndex, count: 1 })
    }
  }

  return runs
}
