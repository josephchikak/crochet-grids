'use client'

import Link from 'next/link'
import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ArrowLeft, Check, CloudOff, ListChecks, ListOrdered, LoaderCircle, Maximize, X, ZoomIn, ZoomOut } from 'lucide-react'
import { analysePattern } from '@/features/pattern/analysis/analyse-pattern'
import { FollowMode, type FollowProgress } from '@/features/pattern/follow/follow-mode'
import type { PaletteEntry, PatternProject, PatternWarning } from '@/features/pattern/model/types'
import type { SaveStatus } from '@/features/pattern/persistence/use-project-autosave'
import { ChecksPanel } from './checks-panel'
import {
  createEditorState,
  editorReducer,
  type ChartViewport,
  type EditorTool
} from './editor-state'
import { EditorToolbar } from './editor-toolbar'
import { PalettePanel } from './palette-panel'
import { PatternCanvas } from './pattern-canvas'
import { zoomViewport } from './render-model'

interface PatternEditorProps {
  project: PatternProject
  onProjectChange: (project: PatternProject) => void
  saveStatus?: SaveStatus
  saveError?: string
}

const toolShortcuts: Record<string, EditorTool> = {
  b: 'pencil',
  g: 'fill',
  i: 'picker',
  e: 'erase',
  h: 'pan'
}

export function PatternEditor ({ project, onProjectChange, saveStatus = 'idle', saveError }: PatternEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, project, createEditorState)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<'palette' | 'checks'>('palette')
  const [isMirrorOpen, setIsMirrorOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const reportedProject = useRef(project)
  const { grid, palette } = state.project
  // Analysis trails behind painting so strokes stay responsive on large charts
  const analysedGrid = useDeferredValue(grid)
  const analysedPalette = useDeferredValue(palette)
  const warnings = useMemo(
    () => analysePattern(analysedGrid, analysedPalette, state.project.backgroundPaletteIndex),
    [analysedGrid, analysedPalette, state.project.backgroundPaletteIndex]
  )

  useEffect(() => {
    if (state.project === reportedProject.current) return
    reportedProject.current = state.project
    onProjectChange(state.project)
  }, [onProjectChange, state.project])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
        return
      }
      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault()
        dispatch({ type: 'redo' })
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const tool = toolShortcuts[key]
      if (tool) dispatch({ type: 'select-tool', tool })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const selectTool = useCallback((tool: EditorTool) => dispatch({ type: 'select-tool', tool }), [])
  const selectColor = useCallback((paletteIndex: number) => dispatch({ type: 'select-color', paletteIndex }), [])
  const updateEntry = useCallback((paletteIndex: number, changes: Partial<Omit<PaletteEntry, 'id'>>) =>
    dispatch({ type: 'update-palette', paletteIndex, changes }), [])
  const replaceColor = useCallback((source: number, replacement: number) =>
    dispatch({ type: 'replace-color', source, replacement }), [])
  const strokeStart = useCallback(() => dispatch({ type: 'stroke-start' }), [])
  const strokeCell = useCallback((column: number, row: number) => dispatch({ type: 'stroke-cell', column, row }), [])
  const strokeEnd = useCallback(() => dispatch({ type: 'stroke-end' }), [])
  const strokeCancel = useCallback(() => dispatch({ type: 'stroke-cancel' }), [])
  const applyTool = useCallback((column: number, row: number) => dispatch({ type: 'apply-tool', column, row }), [])
  const setViewport = useCallback((viewport: ChartViewport) => dispatch({ type: 'set-viewport', viewport }), [])
  const moveCursor = useCallback((columnDelta: number, rowDelta: number) =>
    dispatch({ type: 'move-cursor', columnDelta, rowDelta }), [])
  const handleUndo = useCallback(() => dispatch({ type: 'undo' }), [])
  const handleRedo = useCallback(() => dispatch({ type: 'redo' }), [])
  const openMirror = useCallback(() => setIsMirrorOpen(true), [])
  const openPalette = useCallback(() => {
    setPanelTab('palette')
    setIsPanelOpen(true)
  }, [])
  const openChecks = useCallback(() => {
    setPanelTab('checks')
    setIsPanelOpen(true)
  }, [])
  const focusWarning = useCallback((warning: PatternWarning) => {
    dispatch({ type: 'focus-row', rowNumber: warning.rows[0], cellIndex: warning.cellIndices[0] })
    setIsPanelOpen(false)
  }, [])
  const updateProgress = useCallback((progress: FollowProgress) =>
    dispatch({ type: 'set-progress', ...progress }), [])
  const exitFollow = useCallback(() => setIsFollowing(false), [])
  const toggleSymbols = useCallback(() => dispatch({ type: 'toggle-symbols' }), [])
  const toggleView = useCallback(() => dispatch({
    type: 'set-view',
    view: state.view === 'grid' ? 'crochet' : 'grid'
  }), [state.view])
  const zoomBy = useCallback((factor: number) => setViewport(
    zoomViewport(state.viewport, state.viewport.zoom * factor, { x: 0, y: 0 })
  ), [setViewport, state.viewport])

  return (
    <div className='flex h-dvh flex-col overflow-hidden bg-cotton text-ink'>
      <header className='flex min-h-14 shrink-0 items-center gap-3 border-b border-ink px-3 sm:px-5'>
        <Link aria-label='Back home' className='grid size-11 place-items-center' href='/'>
          <ArrowLeft aria-hidden='true' size={20} />
        </Link>
        <div className='min-w-0 flex-1'>
          <h1 className='truncate text-lg font-semibold tracking-[-0.02em]'>{state.project.name}</h1>
          <p className='flex flex-wrap items-center gap-x-2 font-mono text-xs text-ink-muted'>
            <span>{grid.width} × {grid.height} stitches</span>
            <SaveIndicator error={saveError} status={saveStatus} />
          </p>
        </div>
        <button
          className='flex min-h-11 items-center gap-2 border border-ink bg-indigo px-3 text-sm font-semibold text-white'
          onClick={() => setIsFollowing(true)}
          type='button'
        >
          <ListOrdered aria-hidden='true' size={18} />
          <span className='sr-only sm:not-sr-only'>Follow pattern</span>
        </button>
        <button
          aria-label={`Pattern checks: ${warnings.length} ${warnings.length === 1 ? 'suggestion' : 'suggestions'}`}
          className='flex min-h-11 items-center gap-2 border border-ink px-3 text-sm font-semibold'
          onClick={openChecks}
          type='button'
        >
          <ListChecks aria-hidden='true' size={18} />
          <span className='hidden sm:inline'>Checks</span>
          <span className={`min-w-6 px-1.5 text-center font-mono text-xs ${warnings.length > 0 ? 'bg-poppy text-ink' : 'bg-sage'}`}>{warnings.length}</span>
        </button>
      </header>

      {saveStatus === 'failed' && (
        <p className='flex shrink-0 items-start gap-2 border-b border-poppy bg-poppy/15 px-4 py-2 text-sm leading-6' role='alert'>
          <CloudOff aria-hidden='true' className='mt-1 shrink-0' size={16} />
          <span>This chart isn&apos;t being saved. {saveError ?? 'The browser refused to store it.'} Keep this tab open until you have exported it.</span>
        </p>
      )}

      <div className='relative flex min-h-0 flex-1'>
        <main className='relative min-w-0 flex-1 bg-[#e9e2d3]'>
          <PatternCanvas
            cursor={state.cursor}
            grid={grid}
            highlightRow={state.highlightRow}
            onApplyTool={applyTool}
            onCursorMove={moveCursor}
            onStrokeCancel={strokeCancel}
            onStrokeCell={strokeCell}
            onStrokeEnd={strokeEnd}
            onStrokeStart={strokeStart}
            onViewportChange={setViewport}
            palette={palette}
            showSymbols={state.showSymbols}
            tool={state.tool}
            view={state.view}
            viewport={state.viewport}
          />
          <div className='absolute right-3 top-3 flex flex-col border border-ink bg-cotton'>
            <button aria-label='Zoom in' className='grid size-11 place-items-center' onClick={() => zoomBy(1.4)} type='button'><ZoomIn aria-hidden='true' size={20} /></button>
            <button aria-label='Zoom out' className='grid size-11 place-items-center border-t border-grid' onClick={() => zoomBy(1 / 1.4)} type='button'><ZoomOut aria-hidden='true' size={20} /></button>
            <button aria-label='Fit chart' className='grid size-11 place-items-center border-t border-grid' onClick={() => setViewport({ zoom: 1, offsetX: 0, offsetY: 0 })} type='button'><Maximize aria-hidden='true' size={18} /></button>
          </div>
        </main>

        <aside
          aria-label='Palette and pattern checks'
          className={`${isPanelOpen ? 'flex' : 'hidden'} fixed inset-x-0 bottom-0 z-20 max-h-[72dvh] flex-col border-t border-ink bg-cotton shadow-[0_-8px_24px_rgb(24_32_25/18%)] md:static md:flex md:max-h-none md:w-80 md:border-l md:border-t-0 md:shadow-none lg:w-96`}
        >
          <div className='flex min-h-14 items-stretch justify-between border-b border-grid pl-2'>
            <div aria-label='Side panel' className='flex' role='tablist'>
              <PanelTab controls='palette-panel' label='Palette' onSelect={() => setPanelTab('palette')} selected={panelTab === 'palette'} />
              <PanelTab
                controls='checks-panel'
                count={warnings.length}
                label='Checks'
                onSelect={() => setPanelTab('checks')}
                selected={panelTab === 'checks'}
              />
            </div>
            <button aria-label='Close panel' className='grid size-14 place-items-center md:hidden' onClick={() => setIsPanelOpen(false)} type='button'>
              <X aria-hidden='true' size={20} />
            </button>
          </div>
          <div
            aria-labelledby={`${panelTab}-tab`}
            className='overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'
            id={`${panelTab}-panel`}
            role='tabpanel'
          >
            {panelTab === 'palette'
              ? (
                <PalettePanel
                  activeColor={state.activeColor}
                  grid={grid}
                  onReplaceColor={replaceColor}
                  onSelectColor={selectColor}
                  onUpdateEntry={updateEntry}
                  palette={palette}
                />
                )
              : <ChecksPanel gridWidth={grid.width} onFocusWarning={focusWarning} warnings={warnings} />}
          </div>
        </aside>
      </div>

      <EditorToolbar
        activeEntry={palette[state.activeColor]}
        canRedo={state.history.redoStack.length > 0}
        canUndo={state.history.undoStack.length > 0}
        onMirror={openMirror}
        onOpenPalette={openPalette}
        onRedo={handleRedo}
        onSelectTool={selectTool}
        onToggleSymbols={toggleSymbols}
        onToggleView={toggleView}
        onUndo={handleUndo}
        showSymbols={state.showSymbols}
        tool={state.tool}
        view={state.view}
      />

      {isFollowing && (
        <FollowMode onExit={exitFollow} onProgressChange={updateProgress} project={state.project} />
      )}

      {isMirrorOpen && (
        <MirrorDialog
          onCancel={() => setIsMirrorOpen(false)}
          onConfirm={() => {
            dispatch({ type: 'mirror' })
            setIsMirrorOpen(false)
          }}
        />
      )}
    </div>
  )
}

function SaveIndicator ({ status, error }: { status: SaveStatus, error?: string }) {
  return (
    <span className='inline-flex items-center gap-1' role='status' title={status === 'failed' ? error : undefined}>
      {status === 'saving' && <><LoaderCircle aria-hidden='true' className='animate-spin motion-reduce:animate-none' size={12} /> Saving</>}
      {status === 'saved' && <><Check aria-hidden='true' size={12} /> Saved</>}
      {status === 'failed' && <span className='font-semibold text-poppy'>Not saved</span>}
    </span>
  )
}

function PanelTab ({ label, controls, selected, count, onSelect }: {
  label: string
  controls: string
  selected: boolean
  count?: number
  onSelect: () => void
}) {
  return (
    <button
      aria-controls={controls}
      aria-selected={selected}
      className={`flex min-h-14 items-center gap-2 border-b-2 px-3 font-semibold ${selected ? 'border-ink' : 'border-transparent text-ink-muted'}`}
      id={`${controls.replace('-panel', '')}-tab`}
      onClick={onSelect}
      role='tab'
      type='button'
    >
      {label}
      {count !== undefined && <span className='font-mono text-xs'>{count}</span>}
    </button>
  )
}

function MirrorDialog ({ onCancel, onConfirm }: { onCancel: () => void, onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className='fixed inset-0 z-30 grid place-items-end bg-ink/40 p-4 sm:place-items-center'>
      <div
        aria-describedby='mirror-description'
        aria-labelledby='mirror-title'
        aria-modal='true'
        className='w-full max-w-md border border-ink bg-cotton p-5 shadow-[6px_6px_0_var(--ink)]'
        role='dialog'
      >
        <h2 className='text-xl font-semibold' id='mirror-title'>Mirror the motif?</h2>
        <p className='mt-2 text-sm leading-6 text-ink-muted' id='mirror-description'>
          Every row flips left to right. Your handedness and starting side stay the same, and you can undo this.
        </p>
        <div className='mt-5 flex justify-end gap-3'>
          <button className='min-h-11 border border-ink px-4 font-semibold' onClick={onCancel} ref={cancelRef} type='button'>Cancel</button>
          <button className='primary-action min-h-11' onClick={onConfirm} type='button'>Mirror motif</button>
        </div>
      </div>
    </div>
  )
}

function isEditableTarget (target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}
