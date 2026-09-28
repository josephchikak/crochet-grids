'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PatternProject } from '@/features/pattern/model/types'
import { ProjectStorageError } from './project-repository'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

export const autosaveDelay = 750

export function useProjectAutosave (
  save: (project: PatternProject) => Promise<void>,
  delay = autosaveDelay
) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<Error>()
  const pending = useRef<PatternProject | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inFlight = useRef(false)
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save })

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    timer.current = undefined
    // An in-flight save picks up the newest pending project when it finishes
    if (inFlight.current || !pending.current) return

    inFlight.current = true
    try {
      while (pending.current) {
        const project = pending.current
        pending.current = undefined
        try {
          await saveRef.current(project)
        } catch (saveError) {
          // Keep the latest unsaved version so the next change retries it
          pending.current ??= project
          setError(saveError instanceof Error ? saveError : new ProjectStorageError('unknown'))
          setStatus('failed')
          return
        }
      }
      setError(undefined)
      setStatus('saved')
    } finally {
      inFlight.current = false
    }
  }, [])

  const queueSave = useCallback((project: PatternProject) => {
    pending.current = project
    setStatus('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, delay)
  }, [delay, flush])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const handlePageHide = () => { void flush() }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
      // Leaving the editor saves whatever is still waiting
      void flush()
    }
  }, [flush])

  return { status, error, queueSave, flush }
}
