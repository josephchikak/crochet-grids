'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { getDraftProject, storeDraftProject } from '@/features/pattern/setup/project-drafts'

// Canvas editing code loads only once a project is open
const PatternEditor = dynamic(
  () => import('./pattern-editor').then((module) => module.PatternEditor),
  {
    ssr: false,
    loading: () => (
      <p className='grid h-dvh place-items-center text-ink-muted' role='status'>Opening your chart…</p>
    )
  }
)

export function ProjectEditorScreen ({ projectId }: { projectId: string }) {
  const [project] = useState(() => getDraftProject(projectId))

  if (!project) {
    return (
      <main className='mx-auto grid min-h-dvh max-w-xl content-center gap-5 px-4 text-ink'>
        <h1 className='text-3xl font-semibold tracking-[-0.04em]'>This chart isn&apos;t open on this device</h1>
        <p className='leading-7 text-ink-muted'>Charts stay in this browser. Create a new chart from your image to keep editing.</p>
        <Link className='primary-action w-fit' href='/create'>Create a pattern</Link>
      </main>
    )
  }

  return <PatternEditor onProjectChange={storeDraftProject} project={project} />
}
