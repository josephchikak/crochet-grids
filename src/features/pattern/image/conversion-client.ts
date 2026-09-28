import type {
  ConversionRequest,
  ConversionResult,
  ConversionWorkerResponse
} from './conversion-types'

interface PendingConversion {
  resolve: (result: ConversionResult) => void
  reject: (error: Error) => void
}

export class ConversionCancelledError extends Error {
  constructor () {
    super('Image conversion was cancelled')
    this.name = 'ConversionCancelledError'
  }
}

let worker: Worker | undefined
const pending = new Map<string, PendingConversion>()

export function convertImage (
  request: ConversionRequest,
  signal?: AbortSignal
): Promise<ConversionResult> {
  const conversionWorker = getWorker()

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      pending.delete(request.id)
      reject(new ConversionCancelledError())
      resetWorker()
    }

    if (signal?.aborted) {
      onAbort()
      return
    }

    pending.set(request.id, { resolve, reject })
    signal?.addEventListener('abort', onAbort, { once: true })
    conversionWorker.postMessage({ kind: 'convert', request })
  })
}

function getWorker () {
  if (worker) return worker

  worker = new Worker(new URL('./conversion.worker.ts', import.meta.url), {
    type: 'module'
  })
  worker.addEventListener('message', handleResponse)
  worker.addEventListener('error', () => {
    rejectAll(new Error('The image converter stopped unexpectedly'))
    resetWorker()
  })
  return worker
}

function handleResponse (event: MessageEvent<ConversionWorkerResponse>) {
  const response = event.data
  const conversion = pending.get(response.id)
  if (!conversion) return

  pending.delete(response.id)
  if (response.kind === 'result') conversion.resolve(response.result)
  else conversion.reject(new Error(response.message))
}

function rejectAll (error: Error) {
  for (const conversion of pending.values()) conversion.reject(error)
  pending.clear()
}

function resetWorker () {
  worker?.terminate()
  worker = undefined
}
