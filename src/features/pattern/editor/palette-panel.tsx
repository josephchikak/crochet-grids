'use client'

import { memo, useMemo } from 'react'
import type { PaletteEntry, PatternGrid } from '@/features/pattern/model/types'
import { isDark } from './render-model'

interface PalettePanelProps {
  grid: PatternGrid
  palette: PaletteEntry[]
  activeColor: number
  onSelectColor: (paletteIndex: number) => void
  onUpdateEntry: (paletteIndex: number, changes: Partial<Omit<PaletteEntry, 'id'>>) => void
  onReplaceColor: (source: number, replacement: number) => void
}

export const PalettePanel = memo(function PalettePanel (props: PalettePanelProps) {
  const { grid, palette } = props
  const totals = useMemo(() => {
    const counts = new Array<number>(palette.length).fill(0)
    for (const cell of grid.cells) counts[cell] += 1
    return counts
  }, [grid, palette.length])

  return (
    <ul className='grid gap-3'>
      {palette.map((entry, index) => (
        <PaletteRow
          active={props.activeColor === index}
          count={totals[index]}
          entry={entry}
          index={index}
          key={entry.id}
          onReplaceColor={props.onReplaceColor}
          onSelectColor={props.onSelectColor}
          onUpdateEntry={props.onUpdateEntry}
          palette={palette}
          total={grid.cells.length}
        />
      ))}
    </ul>
  )
})

interface PaletteRowProps {
  entry: PaletteEntry
  index: number
  active: boolean
  count: number
  total: number
  palette: PaletteEntry[]
  onSelectColor: (paletteIndex: number) => void
  onUpdateEntry: (paletteIndex: number, changes: Partial<Omit<PaletteEntry, 'id'>>) => void
  onReplaceColor: (source: number, replacement: number) => void
}

const PaletteRow = memo(function PaletteRow (props: PaletteRowProps) {
  const { entry, index, active, count, total } = props
  const number = index + 1
  const percent = total === 0 ? 0 : Math.round(count / total * 100)

  return (
    <li className={`grid gap-2 border p-3 ${active ? 'border-ink bg-white/50' : 'border-grid'}`}>
      <div className='flex items-center gap-3'>
        <button
          aria-label={`Use colour ${number} (${entry.name})`}
          aria-pressed={active}
          className='grid size-11 shrink-0 place-items-center border border-ink font-mono text-lg'
          onClick={() => props.onSelectColor(index)}
          style={{ background: entry.color, color: isDark(entry.color) ? '#ffffff' : '#182019' }}
          type='button'
        >
          {entry.symbol}
        </button>
        <div className='min-w-0 flex-1'>
          <input
            aria-label={`Yarn name for colour ${number}`}
            className='form-control min-h-11 py-2 font-semibold'
            maxLength={50}
            onChange={(event) => props.onUpdateEntry(index, { name: event.target.value })}
            value={entry.name}
          />
          <p className='mt-1 font-mono text-xs text-ink-muted'>
            {count} {count === 1 ? 'stitch' : 'stitches'} · {percent}%
          </p>
        </div>
      </div>
      <div className='grid grid-cols-[44px_56px_1fr] items-center gap-2'>
        <input
          aria-label={`Colour value for colour ${number}`}
          className='h-11 w-full border border-grid bg-transparent p-1'
          onChange={(event) => props.onUpdateEntry(index, { color: event.target.value })}
          type='color'
          value={entry.color}
        />
        <input
          aria-label={`Symbol for colour ${number}`}
          className='form-control min-h-11 py-2 text-center font-mono'
          maxLength={2}
          onChange={(event) => {
            const symbol = event.target.value.trim()
            if (symbol) props.onUpdateEntry(index, { symbol })
          }}
          value={entry.symbol}
        />
        <select
          aria-label={`Replace colour ${number} with`}
          className='form-control min-h-11 py-2 text-sm'
          onChange={(event) => {
            if (event.target.value !== '') props.onReplaceColor(index, Number(event.target.value))
          }}
          value=''
        >
          <option value=''>Replace with…</option>
          {props.palette.map((other, otherIndex) => otherIndex === index
            ? null
            : <option key={other.id} value={otherIndex}>{other.name}</option>)}
        </select>
      </div>
    </li>
  )
})

