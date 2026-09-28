'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react'
import { getRowDirection, getRowRuns, getRowSide } from '@/features/pattern/crochet/instructions'
import type { PaletteEntry, PatternGrid, PatternProject } from '@/features/pattern/model/types'
import { drawChart, getFollowLayout, isDark, pointToCell } from '@/features/pattern/editor/render-model'

export interface FollowProgress {
  currentRow: number
  completedRows: number[]
}

interface FollowModeProps {
  project: PatternProject
  onProgressChange: (progress: FollowProgress) => void
  onExit?: () => void
}

export function FollowMode ({ project, onProgressChange, onExit }: FollowModeProps) {
  const { grid, palette, startingSide } = project
  const [currentRow, setCurrentRow] = useState(() => clampRow(project.currentRow, grid.height))
  const [completed, setCompleted] = useState(() => new Set(
    project.completedRows.filter((row) => row >= 1 && row <= grid.height)
  ))

  const direction = getRowDirection(currentRow, startingSide)
  const runs = useMemo(() => getRowRuns(grid, currentRow, startingSide), [currentRow, grid, startingSide])
  const isComplete = completed.has(currentRow)

  const commit = useCallback((row: number, rows: Set<number>) => {
    setCurrentRow(row)
    setCompleted(rows)
    onProgressChange({ currentRow: row, completedRows: [...rows].sort((a, b) => a - b) })
  }, [onProgressChange])

  const goToRow = useCallback((row: number) => {
    const next = clampRow(row, grid.height)
    if (next !== currentRow) commit(next, completed)
  }, [commit, completed, currentRow, grid.height])

  const toggleComplete = useCallback(() => {
    const rows = new Set(completed)
    if (rows.has(currentRow)) {
      rows.delete(currentRow)
      commit(currentRow, rows)
      return
    }
    rows.add(currentRow)
    commit(Math.min(grid.height, currentRow + 1), rows)
  }, [commit, completed, currentRow, grid.height])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        goToRow(currentRow + 1)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        goToRow(currentRow - 1)
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        // Buttons already activate on Space; handling it here too would act twice
        event.preventDefault()
        toggleComplete()
      } else if (event.key === 'Escape') {
        onExit?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentRow, goToRow, onExit, toggleComplete])

  const directionLabel = direction === 'right-to-left' ? 'Right to left' : 'Left to right'
  const DirectionIcon = direction === 'right-to-left' ? ArrowLeft : ArrowRight

  return (
    <div
      aria-label={`Follow ${project.name}`}
      aria-modal='true'
      className='fixed inset-0 z-40 flex flex-col bg-cotton text-ink'
      role='dialog'
    >
      <header className='flex min-h-14 shrink-0 items-center gap-3 border-b border-ink px-3 sm:px-5'>
        <button aria-label='Back to editor' className='grid size-11 place-items-center' onClick={onExit} type='button'>
          <X aria-hidden='true' size={22} />
        </button>
        <div className='min-w-0 flex-1'>
          <h1 className='truncate font-semibold'>{project.name}</h1>
          <p className='font-mono text-xs text-ink-muted'>{completed.size} of {grid.height} rows done</p>
        </div>
      </header>

      <div className='relative min-h-0 flex-1 bg-[#e9e2d3]'>
        <FollowChart completed={completed} currentRow={currentRow} grid={grid} onSelectRow={goToRow} palette={palette} />
      </div>

      <section
        aria-live='polite'
        className='shrink-0 border-t border-ink bg-cotton px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6'
      >
        <div className='flex flex-wrap items-end justify-between gap-x-4 gap-y-2'>
          <h2 className='text-3xl font-semibold tracking-[-0.04em]'>Row {currentRow} of {grid.height}</h2>
          <div className='flex flex-wrap gap-2 text-sm font-semibold'>
            <span className='inline-flex min-h-8 items-center gap-1.5 border border-ink bg-ink px-2.5 text-cotton'>
              <DirectionIcon aria-hidden='true' size={16} />
              <span>{directionLabel}</span>
            </span>
            <span className='inline-flex min-h-8 items-center border border-ink px-2.5'>
              {getRowSide(currentRow) === 'right-side' ? 'Right side' : 'Wrong side'}
            </span>
            {isComplete && (
              <span className='inline-flex min-h-8 items-center gap-1 bg-sage px-2.5'>
                <Check aria-hidden='true' size={15} /> Done
              </span>
            )}
          </div>
        </div>
        <p className='mt-1 text-sm text-ink-muted'>
          Start at the {direction === 'right-to-left' ? 'right' : 'left'} edge and work {direction === 'right-to-left' ? 'leftwards' : 'rightwards'}.
        </p>

        <ol
          aria-label={`Colour runs for row ${currentRow}, ${directionLabel.toLowerCase()}`}
          className='mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto'
        >
          {runs.map((run, index) => (
            <RunChip entry={palette[run.paletteIndex]} count={run.count} key={index} />
          ))}
        </ol>

        <div className='mt-3 grid grid-cols-[1fr_1.6fr_1fr] gap-2'>
          <button
            aria-label='Previous row'
            className='flex min-h-14 items-center justify-center gap-1 border border-ink font-semibold disabled:opacity-40'
            disabled={currentRow === 1}
            onClick={() => goToRow(currentRow - 1)}
            type='button'
          >
            <ChevronDown aria-hidden='true' size={20} /> <span className='hidden sm:inline'>Previous</span>
          </button>
          <button
            aria-label={isComplete ? `Mark row ${currentRow} not done` : `Complete row ${currentRow}`}
            className={isComplete
              ? 'flex min-h-14 items-center justify-center gap-2 border border-ink font-semibold'
              : 'primary-action min-h-14 justify-center'}
            onClick={toggleComplete}
            type='button'
          >
            {isComplete
              ? <><RotateCcw aria-hidden='true' size={18} /> Not done</>
              : <><Check aria-hidden='true' size={18} /> Complete row</>}
          </button>
          <button
            aria-label='Next row'
            className='flex min-h-14 items-center justify-center gap-1 border border-ink font-semibold disabled:opacity-40'
            disabled={currentRow === grid.height}
            onClick={() => goToRow(currentRow + 1)}
            type='button'
          >
            <span className='hidden sm:inline'>Next</span> <ChevronUp aria-hidden='true' size={20} />
          </button>
        </div>
      </section>
    </div>
  )
}

function RunChip ({ entry, count }: { entry: PaletteEntry, count: number }) {
  return (
    <li className='flex min-h-11 shrink-0 items-center gap-2 border border-grid-strong bg-white/40 pr-3'>
      <span
        aria-hidden='true'
        className='grid size-11 place-items-center border-r border-grid-strong font-mono text-base'
        style={{ background: entry.color, color: isDark(entry.color) ? '#ffffff' : '#182019' }}
      >
        {entry.symbol}
      </span>
      <span className='font-semibold'>{count} {entry.name}</span>
    </li>
  )
}

interface FollowChartProps {
  grid: PatternGrid
  palette: PaletteEntry[]
  currentRow: number
  completed: Set<number>
  onSelectRow: (row: number) => void
}

const FollowChart = memo(function FollowChart ({ grid, palette, currentRow, completed, onSelectRow }: FollowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const layout = useMemo(() => getFollowLayout(grid, size, currentRow - 1), [currentRow, grid, size])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || size.width === 0) return

    const frame = requestAnimationFrame(() => {
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(size.width * ratio)
      canvas.height = Math.round(size.height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      drawChart(context, size, {
        grid,
        palette,
        layout,
        view: 'grid',
        showSymbols: true,
        highlightRow: currentRow - 1,
        // Completed rows fade most, rows still to work stay legible
        rowOpacity: (row) => row === currentRow - 1 ? 1 : completed.has(row + 1) ? 0.3 : 0.6
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [completed, currentRow, grid, layout, palette, size])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const cell = pointToCell(grid, layout, event.clientX - rect.left, event.clientY - rect.top)
    if (cell) onSelectRow(cell.row + 1)
  }, [grid, layout, onSelectRow])

  return (
    <div className='absolute inset-0' ref={containerRef}>
      <canvas
        aria-label={`Chart with row ${currentRow} highlighted. Tap a row to jump to it.`}
        className='block size-full'
        onPointerDown={handlePointerDown}
        ref={canvasRef}
        role='img'
      />
    </div>
  )
})

function clampRow (row: number, height: number) {
  if (!Number.isInteger(row)) return 1
  return Math.min(height, Math.max(1, row))
}

function isEditableTarget (target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}
