'use client'

import { memo, useMemo } from 'react'
import { CircleCheck } from 'lucide-react'
import type { PatternWarning, PatternWarningType } from '@/features/pattern/model/types'

interface ChecksPanelProps {
  warnings: PatternWarning[]
  gridWidth: number
  onFocusWarning: (warning: PatternWarning) => void
}

const groupCopy: Record<PatternWarningType, { title: string, advice: string }> = {
  'large-chart': {
    title: 'Large chart',
    advice: 'Very large charts can be slow to edit on phones.'
  },
  'similar-colors': {
    title: 'Similar colours',
    advice: 'These yarns may be hard to tell apart while you crochet.'
  },
  'many-changes': {
    title: 'Busy rows',
    advice: 'Frequent colour changes make carrying yarn slow and bulky.'
  },
  'many-row-colors': {
    title: 'Rows with many colours',
    advice: 'Carrying more than four yarns in one row is hard to manage.'
  },
  'small-detail': {
    title: 'Tiny details',
    advice: 'Shapes of one or two stitches can vanish in the finished fabric.'
  },
  'isolated-cell': {
    title: 'Single stitches',
    advice: 'Each lone stitch adds two colour changes. Paint it to match a neighbour.'
  }
}

const groupOrder = Object.keys(groupCopy) as PatternWarningType[]
const maxLocations = 24

export const ChecksPanel = memo(function ChecksPanel ({ warnings, gridWidth, onFocusWarning }: ChecksPanelProps) {
  const groups = useMemo(() => groupOrder
    .map((type) => ({ type, items: warnings.filter((warning) => warning.type === type) }))
    .filter((group) => group.items.length > 0), [warnings])

  if (groups.length === 0) {
    return (
      <p className='flex items-start gap-3 border border-grid p-4 leading-6'>
        <CircleCheck aria-hidden='true' className='mt-0.5 shrink-0 text-indigo' size={20} />
        No problems found. This chart should be comfortable to crochet.
      </p>
    )
  }

  return (
    <div className='grid gap-4'>
      <p className='text-sm leading-6 text-ink-muted'>Suggestions only — you can keep editing and export at any time.</p>
      {groups.map(({ type, items }) => (
        <section className='border border-grid p-3' key={type}>
          <h3 className='flex items-baseline justify-between gap-3 font-semibold'>
            {groupCopy[type].title}
            <span className='font-mono text-xs text-ink-muted'>{items.length}</span>
          </h3>
          <p className='mt-1 text-sm leading-6 text-ink-muted'>{groupCopy[type].advice}</p>
          {items[0].rows.length === 0
            ? <ul className='mt-2 grid gap-2 text-sm leading-6'>{items.map((warning) => <li key={warning.id}>{warning.message}</li>)}</ul>
            : (
              <ul className='mt-3 flex flex-wrap gap-2'>
                {items.slice(0, maxLocations).map((warning) => (
                  <li key={warning.id}>
                    <button
                      aria-label={warning.message}
                      className='min-h-11 border border-ink px-3 font-mono text-xs hover:bg-sage/40'
                      onClick={() => onFocusWarning(warning)}
                      title={warning.message}
                      type='button'
                    >
                      {locationLabel(warning, gridWidth)}
                    </button>
                  </li>
                ))}
                {items.length > maxLocations && (
                  <li className='self-center text-xs text-ink-muted'>and {items.length - maxLocations} more</li>
                )}
              </ul>
              )}
        </section>
      ))}
    </div>
  )
})

function locationLabel (warning: PatternWarning, gridWidth: number) {
  const rows = warning.rows.length > 1 ? `Rows ${warning.rows.join('–')}` : `Row ${warning.rows[0]}`
  const cell = warning.cellIndices[0]
  return warning.type === 'isolated-cell' && cell !== undefined
    ? `${rows} · st ${cell % gridWidth + 1}`
    : rows
}
