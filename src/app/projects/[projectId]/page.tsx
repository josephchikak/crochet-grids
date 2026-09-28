import type { Metadata } from 'next'
import { ProjectEditorScreen } from '@/features/pattern/editor/project-editor-screen'

export const metadata: Metadata = {
  title: 'Edit crochet chart — Crochet Grids',
  description: 'Correct stitches, yarn names and symbols in your crochet motif chart.'
}

export default async function ProjectPage ({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  return <ProjectEditorScreen projectId={projectId} />
}
