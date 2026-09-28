import type { PatternProject } from '@/features/pattern/model/types'

const drafts = new Map<string, PatternProject>()

export function storeDraftProject (project: PatternProject) {
  drafts.set(project.id, project)
}

export function getDraftProject (projectId: string) {
  return drafts.get(projectId)
}
