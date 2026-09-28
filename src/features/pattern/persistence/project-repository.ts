import { z } from 'zod'
import { patternLimits } from '@/features/pattern/model/defaults'
import type { PatternProject } from '@/features/pattern/model/types'
import { currentSchemaVersion, openProjectDatabase } from './database'

export type StorageFailure = 'quota' | 'unavailable' | 'unknown'

export class ProjectStorageError extends Error {
  readonly reason: StorageFailure

  constructor (reason: StorageFailure, options?: { cause?: unknown }) {
    super(storageMessages[reason], options)
    this.name = 'ProjectStorageError'
    this.reason = reason
  }
}

export class ProjectRecordError extends Error {
  readonly reason: 'invalid' | 'unsupported-version'
  readonly projectId: string

  constructor (projectId: string, reason: 'invalid' | 'unsupported-version') {
    super(reason === 'invalid'
      ? 'This saved chart is damaged and cannot be opened.'
      : 'This chart was saved by a newer version of Crochet Grids.')
    this.name = 'ProjectRecordError'
    this.reason = reason
    this.projectId = projectId
  }
}

export interface ProjectSummary {
  id: string
  name: string
  width: number
  height: number
  updatedAt: string
  isReadable: boolean
}

const storageMessages: Record<StorageFailure, string> = {
  quota: 'This device is out of space for saved charts.',
  unavailable: 'This browser is not allowing charts to be saved.',
  unknown: 'The chart could not be saved.'
}

const cropSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zoom: z.number()
})

const projectSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  preparedImage: z.instanceof(Blob),
  imagePreparation: z.object({
    crop: cropSchema,
    brightness: z.number(),
    contrast: z.number(),
    maxColors: z.number().int().min(patternLimits.minColors).max(patternLimits.maxColors),
    removeSpeckles: z.boolean()
  }),
  grid: z.object({
    width: z.number().int().min(patternLimits.minDimension).max(patternLimits.maxDimension),
    height: z.number().int().min(patternLimits.minDimension).max(patternLimits.maxDimension),
    cells: z.instanceof(Uint8Array)
  }).refine((grid) => grid.cells.length === grid.width * grid.height, 'Grid size mismatch'),
  palette: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    symbol: z.string()
  })).min(1).max(patternLimits.maxColors),
  backgroundPaletteIndex: z.literal(0),
  handedness: z.enum(['right', 'left']),
  startingSide: z.enum(['right', 'left']),
  isMirrored: z.boolean(),
  currentRow: z.number().int().min(1),
  completedRows: z.array(z.number().int().min(1))
}).refine(
  (project) => project.grid.cells.every((cell) => cell < project.palette.length),
  'Grid references a missing palette colour'
)

export async function saveProject (project: PatternProject): Promise<void> {
  const database = await open()
  try {
    // put() replaces by id, so a retried save never duplicates a project
    await database.put('projects', project as unknown as Parameters<typeof database.put>[1])
  } catch (error) {
    throw toStorageError(error)
  }
}

export async function getProject (id: string): Promise<PatternProject | undefined> {
  const database = await open()
  let record: unknown
  try {
    record = await database.get('projects', id)
  } catch (error) {
    throw toStorageError(error)
  }
  if (record === undefined) return undefined
  return parseProject(id, record)
}

export async function listProjects (): Promise<ProjectSummary[]> {
  const database = await open()
  let records: unknown[]
  try {
    records = await database.getAllFromIndex('projects', 'updatedAt')
  } catch (error) {
    throw toStorageError(error)
  }

  return records.reverse().map((record) => summarize(record))
}

export async function deleteProject (id: string): Promise<void> {
  const database = await open()
  try {
    await database.delete('projects', id)
  } catch (error) {
    throw toStorageError(error)
  }
}

function parseProject (id: string, record: unknown): PatternProject {
  const version = (record as { schemaVersion?: unknown }).schemaVersion
  if (typeof version === 'number' && version > currentSchemaVersion) {
    throw new ProjectRecordError(id, 'unsupported-version')
  }

  const result = projectSchema.safeParse(migrate(record))
  if (!result.success) throw new ProjectRecordError(id, 'invalid')
  return result.data as PatternProject
}

// Version 1 is the first schema; later versions add their upgrade steps here
function migrate (record: unknown) {
  return record
}

function summarize (record: unknown): ProjectSummary {
  const raw = record as Partial<PatternProject> & { id: string, updatedAt: string }
  let isReadable = true
  try {
    parseProject(raw.id, record)
  } catch {
    isReadable = false
  }

  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Untitled chart',
    width: typeof raw.grid?.width === 'number' ? raw.grid.width : 0,
    height: typeof raw.grid?.height === 'number' ? raw.grid.height : 0,
    updatedAt: raw.updatedAt,
    isReadable
  }
}

async function open () {
  try {
    return await openProjectDatabase()
  } catch (error) {
    throw new ProjectStorageError('unavailable', { cause: error })
  }
}

function toStorageError (error: unknown) {
  if (error instanceof ProjectStorageError) return error
  const name = error instanceof Error || error instanceof DOMException ? error.name : ''
  if (name === 'QuotaExceededError') return new ProjectStorageError('quota', { cause: error })
  if (name === 'InvalidStateError' || name === 'SecurityError') {
    return new ProjectStorageError('unavailable', { cause: error })
  }
  return new ProjectStorageError('unknown', { cause: error })
}
