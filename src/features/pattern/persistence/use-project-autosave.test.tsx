import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PatternProject } from '@/features/pattern/model/types'
import { ProjectStorageError } from './project-repository'
import { useProjectAutosave } from './use-project-autosave'

const project = { id: 'project-1', name: 'Heart' } as PatternProject

function setVisibility (state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useProjectAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('saves 750 ms after the last change', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjectAutosave(save))

    act(() => result.current.queueSave(project))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.queueSave({ ...project, name: 'Heart 2' }))
    expect(result.current.status).toBe('saving')

    await act(async () => vi.advanceTimersByTime(749))
    expect(save).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(1))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Heart 2' }))
    expect(result.current.status).toBe('saved')
  })

  it('flushes immediately when the page is hidden', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjectAutosave(save))

    act(() => result.current.queueSave(project))
    await act(async () => setVisibility('hidden'))

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('reports failures as not saved and retries on the next change', async () => {
    const save = vi.fn()
      .mockRejectedValueOnce(new ProjectStorageError('quota'))
      .mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjectAutosave(save))

    act(() => result.current.queueSave(project))
    await act(async () => vi.advanceTimersByTime(750))
    expect(result.current.status).toBe('failed')
    expect(result.current.error?.message).toBe('This device is out of space for saved charts.')

    act(() => result.current.queueSave({ ...project, name: 'Retry' }))
    await act(async () => vi.advanceTimersByTime(750))
    expect(result.current.status).toBe('saved')
    expect(result.current.error).toBeUndefined()
  })

  it('saves the newest project after an in-flight save finishes', async () => {
    let finishFirst: () => void = () => {}
    const save = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve }))
      .mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjectAutosave(save))

    act(() => result.current.queueSave(project))
    await act(async () => vi.advanceTimersByTime(750))
    act(() => result.current.queueSave({ ...project, name: 'Newest' }))
    await act(async () => vi.advanceTimersByTime(750))
    expect(save).toHaveBeenCalledTimes(1)

    await act(async () => finishFirst())
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Newest' }))
    expect(result.current.status).toBe('saved')
  })
})
