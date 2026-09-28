'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import type { ProjectSummary } from './project-repository'

// Storage code (idb, Zod) loads after the landing page renders
const loadRepository = () => import('./project-repository')

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready', projects: ProjectSummary[] }
  | { kind: 'unavailable' }

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function RecentProjects () {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [confirmingId, setConfirmingId] = useState<string>()
  const [deleteError, setDeleteError] = useState<string>()

  useEffect(() => {
    let isCurrent = true
    loadRepository()
      .then(({ listProjects }) => listProjects())
      .then((projects) => { if (isCurrent) setState({ kind: 'ready', projects }) })
      .catch(() => { if (isCurrent) setState({ kind: 'unavailable' }) })
    return () => { isCurrent = false }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setDeleteError(undefined)
    try {
      const { deleteProject } = await loadRepository()
      await deleteProject(id)
      setConfirmingId(undefined)
      setState((current) => current.kind === 'ready'
        ? { kind: 'ready', projects: current.projects.filter((project) => project.id !== id) }
        : current)
    } catch {
      setDeleteError('That chart could not be deleted. Try again.')
    }
  }, [])

  if (state.kind === 'loading') return null
  if (state.kind === 'unavailable') {
    return (
      <section className='border-b border-grid bg-cotton'>
        <p className='mx-auto flex max-w-[1440px] items-start gap-3 px-5 py-5 text-sm leading-6 sm:px-10 lg:px-14' role='alert'>
          <TriangleAlert aria-hidden='true' className='mt-0.5 shrink-0 text-poppy' size={18} />
          This browser isn&apos;t saving charts, which can happen in private browsing. You can still make and export a chart, but it will be gone when you close the tab.
        </p>
      </section>
    )
  }
  if (state.projects.length === 0) return null

  return (
    <section aria-labelledby='recent-projects-title' className='border-b border-grid bg-cotton'>
      <div className='mx-auto max-w-[1440px] px-5 py-10 sm:px-10 lg:px-14'>
        <h2 className='text-2xl font-semibold tracking-[-0.035em]' id='recent-projects-title'>Your charts on this device</h2>
        {deleteError && <p className='mt-3 text-sm font-semibold text-poppy' role='alert'>{deleteError}</p>}
        <ul className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {state.projects.map((project) => (
            <li className='flex flex-col justify-between gap-4 border border-ink bg-white/35 p-4' key={project.id}>
              <div>
                <h3 className='truncate text-lg font-semibold'>{project.name}</h3>
                <p className='mt-1 font-mono text-xs text-ink-muted'>
                  {project.width} × {project.height} stitches · {formatDate(project.updatedAt)}
                </p>
                {!project.isReadable && (
                  <p className='mt-2 text-sm text-poppy'>This chart can&apos;t be opened. It may have been saved by a newer version or damaged.</p>
                )}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                {project.isReadable && (
                  <Link
                    aria-label={`Continue ${project.name}`}
                    className='inline-flex min-h-11 items-center gap-2 border border-ink bg-indigo px-4 font-semibold text-white'
                    href={`/projects/${project.id}`}
                  >
                    Continue <ArrowRight aria-hidden='true' size={16} />
                  </Link>
                )}
                {confirmingId === project.id
                  ? (
                    <>
                      <button
                        aria-label={`Confirm delete ${project.name}`}
                        className='min-h-11 border border-poppy bg-poppy px-4 font-semibold text-ink'
                        onClick={() => void handleDelete(project.id)}
                        type='button'
                      >
                        Delete for good
                      </button>
                      <button className='min-h-11 px-3 text-sm underline' onClick={() => setConfirmingId(undefined)} type='button'>Keep</button>
                    </>
                    )
                  : (
                    <button
                      aria-label={`Delete ${project.name}`}
                      className='min-h-11 border border-grid-strong px-4 text-sm'
                      onClick={() => setConfirmingId(project.id)}
                      type='button'
                    >
                      Delete
                    </button>
                    )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function formatDate (value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : dateFormat.format(date)
}
