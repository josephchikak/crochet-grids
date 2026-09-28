// @vitest-environment node
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PatternProject } from '@/features/pattern/model/types'
import { closeProjectDatabase, openProjectDatabase } from './database'
import {
  deleteProject,
  getProject,
  listProjects,
  ProjectRecordError,
  ProjectStorageError,
  saveProject
} from './project-repository'

function createProject (overrides: Partial<PatternProject> = {}): PatternProject {
  return {
    id: 'project-1',
    schemaVersion: 1,
    name: 'Heart',
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-28T09:00:00.000Z',
    preparedImage: new Blob(['png-bytes'], { type: 'image/png' }),
    imagePreparation: {
      crop: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      brightness: 0,
      contrast: 0,
      maxColors: 2,
      removeSpeckles: true
    },
    grid: { width: 3, height: 2, cells: Uint8Array.from([0, 1, 0, 1, 1, 0]) },
    palette: [
      { id: 'color-0', name: 'Cream', color: '#f5efe3', symbol: '□' },
      { id: 'color-1', name: 'Red', color: '#c0392b', symbol: '●' }
    ],
    backgroundPaletteIndex: 0,
    handedness: 'right',
    startingSide: 'right',
    isMirrored: false,
    currentRow: 3,
    completedRows: [1, 2],
    ...overrides
  }
}

describe('project repository', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await closeProjectDatabase()
  })

  it('round-trips typed grid data and progress', async () => {
    const project = createProject()
    await saveProject(project)
    const restored = await getProject(project.id)

    expect(restored?.grid.cells).toBeInstanceOf(Uint8Array)
    expect(Array.from(restored?.grid.cells ?? [])).toEqual(Array.from(project.grid.cells))
    expect(restored?.completedRows).toEqual([1, 2])
    expect(restored?.currentRow).toBe(3)
    expect(await restored?.preparedImage.text()).toBe('png-bytes')
  })

  it('returns undefined for a project that does not exist', async () => {
    expect(await getProject('missing')).toBeUndefined()
  })

  it('overwrites a project by id instead of duplicating it', async () => {
    await saveProject(createProject())
    await saveProject(createProject({ name: 'Renamed heart' }))

    const projects = await listProjects()
    expect(projects).toHaveLength(1)
    expect(projects[0]).toMatchObject({ id: 'project-1', name: 'Renamed heart' })
  })

  it('lists project summaries newest first', async () => {
    await saveProject(createProject({ id: 'old', name: 'Old', updatedAt: '2026-09-01T00:00:00.000Z' }))
    await saveProject(createProject({ id: 'new', name: 'New', updatedAt: '2026-09-27T00:00:00.000Z' }))
    await saveProject(createProject({ id: 'mid', name: 'Mid', updatedAt: '2026-09-15T00:00:00.000Z' }))

    expect(await listProjects()).toEqual([
      { id: 'new', name: 'New', width: 3, height: 2, updatedAt: '2026-09-27T00:00:00.000Z', isReadable: true },
      { id: 'mid', name: 'Mid', width: 3, height: 2, updatedAt: '2026-09-15T00:00:00.000Z', isReadable: true },
      { id: 'old', name: 'Old', width: 3, height: 2, updatedAt: '2026-09-01T00:00:00.000Z', isReadable: true }
    ])
  })

  it('deletes a project', async () => {
    await saveProject(createProject())
    await deleteProject('project-1')

    expect(await getProject('project-1')).toBeUndefined()
    expect(await listProjects()).toEqual([])
  })

  it('rejects projects saved by a newer schema without deleting them', async () => {
    const database = await openProjectDatabase()
    await database.put('projects', { ...createProject(), schemaVersion: 2 } as never)

    await expect(getProject('project-1')).rejects.toBeInstanceOf(ProjectRecordError)
    await expect(getProject('project-1')).rejects.toMatchObject({ reason: 'unsupported-version' })
    expect(await listProjects()).toEqual([
      expect.objectContaining({ id: 'project-1', isReadable: false })
    ])
  })

  it('reports corrupted records as recoverable errors', async () => {
    const database = await openProjectDatabase()
    await database.put('projects', { ...createProject(), grid: { width: 3, height: 2, cells: [0, 1] } } as never)

    await expect(getProject('project-1')).rejects.toMatchObject({
      name: 'ProjectRecordError',
      reason: 'invalid'
    })
    await deleteProject('project-1')
    expect(await listProjects()).toEqual([])
  })

  it('maps a full disk to ProjectStorageError', async () => {
    await openProjectDatabase()
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })

    await expect(saveProject(createProject())).rejects.toBeInstanceOf(ProjectStorageError)
    await expect(saveProject(createProject())).rejects.toMatchObject({ reason: 'quota' })
  })

  it('maps missing IndexedDB to ProjectStorageError', async () => {
    await closeProjectDatabase()
    vi.stubGlobal('indexedDB', undefined)

    await expect(listProjects()).rejects.toMatchObject({
      name: 'ProjectStorageError',
      reason: 'unavailable'
    })
    vi.unstubAllGlobals()
  })
})
