import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const databaseName = 'crochet-grids'
export const databaseVersion = 1
export const currentSchemaVersion = 1

// Records are stored as saved; validation happens on read so bad rows stay recoverable
export interface CrochetGridsSchema extends DBSchema {
  projects: {
    key: string
    value: { id: string, updatedAt: string, [field: string]: unknown }
    indexes: { updatedAt: string }
  }
}

export type ProjectDatabase = IDBPDatabase<CrochetGridsSchema>

let databasePromise: Promise<ProjectDatabase> | undefined

export function openProjectDatabase (): Promise<ProjectDatabase> {
  if (typeof indexedDB === 'undefined' || indexedDB === null) {
    return Promise.reject(new Error('IndexedDB is not available in this browser'))
  }

  databasePromise ??= openDB<CrochetGridsSchema>(databaseName, databaseVersion, {
    upgrade (database, oldVersion) {
      if (oldVersion < 1) {
        const projects = database.createObjectStore('projects', { keyPath: 'id' })
        projects.createIndex('updatedAt', 'updatedAt')
      }
    },
    blocking () {
      // Another tab is upgrading; release the connection so it can proceed
      void closeProjectDatabase()
    }
  }).catch((error: unknown) => {
    databasePromise = undefined
    throw error
  })

  return databasePromise
}

export async function closeProjectDatabase () {
  const pending = databasePromise
  databasePromise = undefined
  if (!pending) return
  try {
    const database = await pending
    database.close()
  } catch {
    // Opening already failed; nothing to close
  }
}
