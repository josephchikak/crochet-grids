'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { PatternProject } from '@/features/pattern/model/types'
import { getProject, ProjectRecordError, saveProject } from '@/features/pattern/persistence/project-repository'
import { useProjectAutosave } from '@/features/pattern/persistence/use-project-autosave'
import { getDraftProject, storeDraftProject } from '@/features/pattern/setup/project-drafts'

// Canvas editing code loads only once a project is open
const PatternEditor = dynamic(
  () => import('./pattern-editor').then((module) => module.PatternEditor),
  {
    ssr: false,
    loading: () => <OpeningChart />
  }
)

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready', project: PatternProject }
  | { kind: 'missing' }
  | { kind: 'failed', title: string, message: string }

export function ProjectEditorScreen ({ projectId }: { projectId: string }) {
  // The in-memory draft is always the newest copy, even if storage is lagging or blocked
  const [draft] = useState(() => getDraftProject(projectId))
  const [state, setState] = useState<LoadState>(() => draft ? { kind: 'ready', project: draft } : { kind: 'loading' })
  const { status, error, queueSave } = useProjectAutosave(saveProject)

  useEffect(() => {
    let isCurrent = true
    if (draft) {
      // Confirms the draft reached storage, or surfaces "Not saved" if it can't
      queueSave(draft)
      return
    }

    getProject(projectId)
      .then((project) => {
        if (!isCurrent) return
        if (!project) {
          setState({ kind: 'missing' })
          return
        }
        storeDraftProject(project)
        setState({ kind: 'ready', project })
      })
      .catch((loadError: unknown) => {
        if (!isCurrent) return
        setState(loadError instanceof ProjectRecordError
          ? { kind: 'failed', title: 'This chart can’t be opened', message: loadError.message }
          : { kind: 'failed', title: 'Saved charts aren’t available', message: 'This browser isn’t allowing Crochet Grids to read saved charts, which can happen in private browsing.' })
      })

    return () => { isCurrent = false }
  }, [draft, projectId, queueSave])

  const handleProjectChange = useCallback((project: PatternProject) => {
    storeDraftProject(project)
    queueSave(project)
  }, [queueSave])

  switch (state.kind) {
    case 'loading':
      return <OpeningChart />
    case 'missing':
      return (
        <Notice
          message='Charts are saved in the browser where they were made. Check you are using the same device and browser, or create a new chart.'
          title='This chart isn’t on this device'
        />
      )
    case 'failed':
      return <Notice message={state.message} title={state.title} />
    case 'ready':
      return (
        <PatternEditor
          onProjectChange={handleProjectChange}
          project={state.project}
          saveError={error?.message}
          saveStatus={status}
        />
      )
  }
}

function OpeningChart () {
  return <p className='grid h-dvh place-items-center text-ink-muted' role='status'>Opening your chart…</p>
}

function Notice ({ title, message }: { title: string, message: string }) {
  return (
    <main className='mx-auto grid min-h-dvh max-w-xl content-center gap-5 px-4 text-ink'>
      <h1 className='text-3xl font-semibold tracking-[-0.04em]'>{title}</h1>
      <p className='leading-7 text-ink-muted'>{message}</p>
      <div className='flex flex-wrap items-center gap-4'>
        <Link className='primary-action w-fit' href='/create'>Create a pattern</Link>
        <Link className='text-link' href='/'>See saved charts</Link>
      </div>
    </main>
  )
}
