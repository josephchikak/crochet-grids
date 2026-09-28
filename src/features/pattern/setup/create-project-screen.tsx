'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { convertImage } from '@/features/pattern/image/conversion-client'
import type { PatternProject } from '@/features/pattern/model/types'
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
  const handleCreated = useCallback((project: PatternProject) => {
    storeDraftProject(project)
    router.push(`/projects/${project.id}`)
  }, [router])

  return <ProjectSetupForm convertImage={convertImage} onCreated={handleCreated} />
}
