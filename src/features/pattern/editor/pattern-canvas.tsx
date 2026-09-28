'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { PaletteEntry, PatternGrid } from '@/features/pattern/model/types'
import { isStrokeTool, type ChartView, type ChartViewport, type EditorTool } from './editor-state'
import { cellRect, drawChart, getChartLayout, pointToCell, zoomViewport } from './render-model'

interface PatternCanvasProps {
  grid: PatternGrid
  palette: PaletteEntry[]
  view: ChartView
  showSymbols: boolean
  viewport: ChartViewport
  cursor: { column: number, row: number }
  highlightRow?: number
  tool: EditorTool
  onStrokeStart: () => void
  onStrokeCell: (column: number, row: number) => void
  onStrokeEnd: () => void
  onStrokeCancel: () => void
  onApplyTool: (column: number, row: number) => void
  onViewportChange: (viewport: ChartViewport) => void
  onCursorMove: (columnDelta: number, rowDelta: number) => void
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'stroke', lastCell?: string }
  | { kind: 'pan', lastX: number, lastY: number }
  | { kind: 'pinch', distance: number, midX: number, midY: number, viewport: ChartViewport }

const keyMoves: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1]
}

export const PatternCanvas = memo(function PatternCanvas (props: PatternCanvasProps) {
  const { grid, palette, view, showSymbols, viewport, cursor, highlightRow, tool } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointers = useRef(new Map<number, { x: number, y: number }>())
  const gesture = useRef<Gesture>({ kind: 'none' })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false)
  const layout = useMemo(() => getChartLayout(grid, size, viewport), [grid, size, viewport])

  // Keep the latest callbacks without re-binding native listeners
  const latest = useRef({ props, layout, size })
  useEffect(() => { latest.current = { props, layout, size } })

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
        view,
        showSymbols,
        highlightRow,
        cursor: hasKeyboardFocus || highlightRow !== undefined ? cursor : undefined
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [cursor, grid, hasKeyboardFocus, highlightRow, layout, palette, showSymbols, size, view])

  // Bring the cursor back into view when the keyboard or a pattern check moves it off-screen
  useEffect(() => {
    const { props: current, layout: currentLayout, size: currentSize } = latest.current
    if (currentSize.width === 0) return
    const rect = cellRect(current.grid, currentLayout, cursor.column, cursor.row)
    const isVisible = rect.x >= 0 && rect.y >= 0 &&
      rect.x + rect.size <= currentSize.width && rect.y + rect.size <= currentSize.height
    if (isVisible) return

    current.onViewportChange({
      ...current.viewport,
      offsetX: current.viewport.offsetX + currentSize.width / 2 - (rect.x + rect.size / 2),
      offsetY: current.viewport.offsetY + currentSize.height / 2 - (rect.y + rect.size / 2)
    })
  }, [cursor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const { props: current, size: currentSize } = latest.current
      if (event.ctrlKey || event.metaKey) {
        const point = relativePoint(canvas, event.clientX, event.clientY)
        current.onViewportChange(zoomViewport(
          current.viewport,
          current.viewport.zoom * Math.exp(-event.deltaY * 0.01),
          { x: point.x - currentSize.width / 2, y: point.y - currentSize.height / 2 }
        ))
        return
      }
      current.onViewportChange({
        ...current.viewport,
        offsetX: current.viewport.offsetX - event.deltaX,
        offsetY: current.viewport.offsetY - event.deltaY
      })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  const cellAt = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const point = relativePoint(canvas, clientX, clientY)
    return pointToCell(grid, layout, point.x, point.y)
  }, [grid, layout])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    // A second finger always switches to pan/zoom and never paints
    if (pointers.current.size === 2) {
      if (gesture.current.kind === 'stroke') props.onStrokeCancel()
      const [first, second] = [...pointers.current.values()]
      const canvas = event.currentTarget
      const mid = relativePoint(canvas, (first.x + second.x) / 2, (first.y + second.y) / 2)
      gesture.current = {
        kind: 'pinch',
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        midX: mid.x,
        midY: mid.y,
        viewport
      }
      return
    }
    if (pointers.current.size > 2) return

    const usePan = tool === 'pan' || event.button === 1
    if (usePan) {
      gesture.current = { kind: 'pan', lastX: event.clientX, lastY: event.clientY }
      return
    }

    const cell = cellAt(event.clientX, event.clientY)
    if (isStrokeTool(tool)) {
      props.onStrokeStart()
      gesture.current = { kind: 'stroke' }
      if (cell) {
        props.onStrokeCell(cell.column, cell.row)
        gesture.current = { kind: 'stroke', lastCell: `${cell.column}:${cell.row}` }
      }
      return
    }

    gesture.current = { kind: 'none' }
    if (cell) props.onApplyTool(cell.column, cell.row)
  }, [cellAt, props, tool, viewport])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = gesture.current

    if (current.kind === 'pinch' && pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()]
      const mid = relativePoint(event.currentTarget, (first.x + second.x) / 2, (first.y + second.y) / 2)
      const distance = Math.hypot(first.x - second.x, first.y - second.y)
      const zoomed = zoomViewport(
        current.viewport,
        current.viewport.zoom * distance / Math.max(1, current.distance),
        { x: current.midX - size.width / 2, y: current.midY - size.height / 2 }
      )
      props.onViewportChange({
        ...zoomed,
        offsetX: zoomed.offsetX + mid.x - current.midX,
        offsetY: zoomed.offsetY + mid.y - current.midY
      })
      return
    }

    if (current.kind === 'pan') {
      props.onViewportChange({
        ...viewport,
        offsetX: viewport.offsetX + event.clientX - current.lastX,
        offsetY: viewport.offsetY + event.clientY - current.lastY
      })
      gesture.current = { kind: 'pan', lastX: event.clientX, lastY: event.clientY }
      return
    }

    if (current.kind === 'stroke') {
      const cell = cellAt(event.clientX, event.clientY)
      const key = cell && `${cell.column}:${cell.row}`
      if (!cell || key === current.lastCell) return
      props.onStrokeCell(cell.column, cell.row)
      gesture.current = { kind: 'stroke', lastCell: key ?? undefined }
    }
  }, [cellAt, props, size, viewport])

  const handlePointerEnd = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    if (gesture.current.kind === 'stroke') props.onStrokeEnd()
    // Lifting one finger of a pinch must not turn the other into a brush
    if (pointers.current.size === 0 || gesture.current.kind !== 'pinch') {
      gesture.current = { kind: 'none' }
    }
  }, [props])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLCanvasElement>) => {
    const move = keyMoves[event.key]
    if (move) {
      event.preventDefault()
      props.onCursorMove(move[0], move[1])
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      props.onApplyTool(cursor.column, cursor.row)
    }
  }, [cursor, props])

  return (
    <div className='absolute inset-0' ref={containerRef}>
      <canvas
        aria-describedby='chart-keyboard-help'
        aria-label={`Pattern chart, ${grid.width} stitches by ${grid.height} rows. Cursor at stitch ${cursor.column + 1}, row ${cursor.row + 1}.`}
        className='block size-full touch-none select-none focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-poppy'
        onBlur={() => setHasKeyboardFocus(false)}
        onFocus={() => setHasKeyboardFocus(true)}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        ref={canvasRef}
        role='application'
        style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
        tabIndex={0}
      />
      <p className='sr-only' id='chart-keyboard-help'>Use the arrow keys to move between stitches and Enter to apply the selected tool.</p>
    </div>
  )
})

function relativePoint (element: Element, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}
