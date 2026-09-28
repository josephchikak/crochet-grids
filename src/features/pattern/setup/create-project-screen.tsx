'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { convertImage } from '@/features/pattern/image/conversion-client'
import type { PatternProject } from '@/features/pattern/model/types'
import { saveProject } from '@/features/pattern/persistence/project-repository'
import { storeDraftProject } from './project-drafts'

// Image tooling (cropper, Zod, worker client) loads only on this route
const ProjectSetupForm = dynamic(
  () => import('./project-setup-form').then((module) => module.ProjectSetupForm),
  {
    ssr: false,
    loading: () => (
      <p className='border border-grid bg-white/35 p-6 text-ink-muted' role='status'>
        Loading the chart setup…
      </p>
    )
  }
)

export function CreateProjectScreen () {
  const router = useRouter()
  const handleCreated = useCallback(async (project: PatternProject) => {
    // The in-memory copy lets the editor open even when this browser refuses storage
    storeDraftProject(project)
    try {
      await saveProject(project)
    } catch {
      // The editor retries saving and shows "Not saved" if storage stays unavailable
    }
    router.push(`/projects/${project.id}`)
  }, [router])

  return <ProjectSetupForm convertImage={convertImage} onCreated={handleCreated} />
}
