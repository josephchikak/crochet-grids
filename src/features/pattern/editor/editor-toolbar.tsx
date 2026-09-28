'use client'

import { memo, type ReactNode } from 'react'
import {
  Asterisk,
  Eraser,
  FlipHorizontal2,
  Hand,
  PaintBucket,
  Pencil,
  Pipette,
  Redo2,
  Scan,
  Undo2
} from 'lucide-react'
import type { PaletteEntry } from '@/features/pattern/model/types'
import type { ChartView, EditorTool } from './editor-state'

interface EditorToolbarProps {
  tool: EditorTool
  view: ChartView
  showSymbols: boolean
  canUndo: boolean
  canRedo: boolean
  activeEntry: PaletteEntry
  onSelectTool: (tool: EditorTool) => void
  onUndo: () => void
  onRedo: () => void
  onMirror: () => void
  onToggleView: () => void
  onToggleSymbols: () => void
  onOpenPalette: () => void
}

const tools: Array<{ tool: EditorTool, label: string, shortcut: string, icon: ReactNode }> = [
  { tool: 'pencil', label: 'Pencil', shortcut: 'B', icon: <Pencil aria-hidden='true' size={20} /> },
  { tool: 'fill', label: 'Fill', shortcut: 'G', icon: <PaintBucket aria-hidden='true' size={20} /> },
  { tool: 'picker', label: 'Pick colour', shortcut: 'I', icon: <Pipette aria-hidden='true' size={20} /> },
  { tool: 'erase', label: 'Erase', shortcut: 'E', icon: <Eraser aria-hidden='true' size={20} /> },
  { tool: 'pan', label: 'Pan', shortcut: 'H', icon: <Hand aria-hidden='true' size={20} /> }
]

export const EditorToolbar = memo(function EditorToolbar (props: EditorToolbarProps) {
  return (
    <nav
      aria-label='Editing tools'
      className='flex min-h-14 shrink-0 gap-1 overflow-x-auto border-t border-ink bg-cotton px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]'
    >
      <button
        aria-label={`Palette, current colour ${props.activeEntry.name}`}
        className='tool-button md:hidden'
        onClick={props.onOpenPalette}
        type='button'
      >
        <span aria-hidden='true' className='size-5 border border-ink' style={{ background: props.activeEntry.color }} />
        <span className='text-xs'>Palette</span>
      </button>
      {tools.map(({ tool, label, shortcut, icon }) => (
        <ToolButton
          key={tool}
          label={label}
          onClick={() => props.onSelectTool(tool)}
          pressed={props.tool === tool}
          title={`${label} (${shortcut})`}
        >
          {icon}
        </ToolButton>
      ))}
      <span aria-hidden='true' className='mx-1 w-px shrink-0 self-stretch bg-grid' />
      <ToolButton disabled={!props.canUndo} label='Undo' onClick={props.onUndo} title='Undo (Ctrl+Z)'>
        <Undo2 aria-hidden='true' size={20} />
      </ToolButton>
      <ToolButton disabled={!props.canRedo} label='Redo' onClick={props.onRedo} title='Redo (Ctrl+Shift+Z)'>
        <Redo2 aria-hidden='true' size={20} />
      </ToolButton>
      <ToolButton label='Mirror' onClick={props.onMirror} title='Mirror the motif'>
        <FlipHorizontal2 aria-hidden='true' size={20} />
      </ToolButton>
      <span aria-hidden='true' className='mx-1 w-px shrink-0 self-stretch bg-grid' />
      <ToolButton label='Crochet preview' onClick={props.onToggleView} pressed={props.view === 'crochet'} title='Crochet preview'>
        <Scan aria-hidden='true' size={20} />
      </ToolButton>
      <ToolButton label='Symbols' onClick={props.onToggleSymbols} pressed={props.showSymbols} title='Show palette symbols'>
        <Asterisk aria-hidden='true' size={20} />
      </ToolButton>
    </nav>
  )
})

interface ToolButtonProps {
  label: string
  title: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolButton ({ label, title, pressed, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      aria-pressed={pressed}
      className='tool-button'
      disabled={disabled}
      onClick={onClick}
      title={title}
      type='button'
    >
      {children}
      <span className='text-xs'>{label}</span>
    </button>
  )
}
