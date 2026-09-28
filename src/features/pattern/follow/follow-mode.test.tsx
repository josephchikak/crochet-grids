import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { PatternProject } from '@/features/pattern/model/types'
import { FollowMode, type FollowProgress } from './follow-mode'

// 5 stitches × 60 rows; crochet row 1 is [Cream, Cream, Red, Red, Red] read left to right on the chart
function createProject (overrides: Partial<PatternProject> = {}): PatternProject {
  const cells = new Uint8Array(5 * 60)
  cells.set([0, 0, 1, 1, 1], 0)
  cells.set([1, 1, 1, 1, 0], 5)

  return {
    id: 'project-1',
    schemaVersion: 1,
    name: 'Heart',
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    preparedImage: new Blob(),
    imagePreparation: {
      crop: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      brightness: 0,
      contrast: 0,
      maxColors: 2,
      removeSpeckles: true
    },
    grid: { width: 5, height: 60, cells },
    palette: [
      { id: 'color-0', name: 'Cream', color: '#f5efe3', symbol: '□' },
      { id: 'color-1', name: 'Red', color: '#c0392b', symbol: '●' }
    ],
    backgroundPaletteIndex: 0,
    handedness: 'right',
    startingSide: 'right',
    isMirrored: false,
    currentRow: 1,
    completedRows: [],
    ...overrides
  }
}

function runTexts () {
  const list = screen.getByRole('list', { name: /colour runs/i })
  return within(list).getAllByRole('listitem').map((item) => item.textContent)
}

describe('FollowMode', () => {
  let onProgressChange: Mock<(progress: FollowProgress) => void>

  beforeEach(() => {
    onProgressChange = vi.fn<(progress: FollowProgress) => void>()
    vi.stubGlobal('ResizeObserver', class {
      observe () {}
      disconnect () {}
    })
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never
  })

  it('shows row one from the bottom in working direction', () => {
    render(<FollowMode project={createProject()} onProgressChange={onProgressChange} />)

    expect(screen.getByText('Row 1 of 60')).toBeInTheDocument()
    expect(screen.getByText('Right to left')).toBeInTheDocument()
    expect(screen.getByText('Right side')).toBeInTheDocument()
  })

  it('writes colour runs in the working direction with symbols and yarn names', () => {
    render(<FollowMode project={createProject()} onProgressChange={onProgressChange} />)

    expect(runTexts()).toEqual(['●3 Red', '□2 Cream'])
  })

  it('reverses the first row when starting on the left', () => {
    render(<FollowMode project={createProject({ startingSide: 'left' })} onProgressChange={onProgressChange} />)

    expect(screen.getByText('Left to right')).toBeInTheDocument()
    expect(runTexts()).toEqual(['□2 Cream', '●3 Red'])
  })

  it('alternates direction and side on the next row', async () => {
    const user = userEvent.setup()
    render(<FollowMode project={createProject()} onProgressChange={onProgressChange} />)

    await user.click(screen.getByRole('button', { name: 'Next row' }))

    expect(screen.getByText('Row 2 of 60')).toBeInTheDocument()
    expect(screen.getByText('Left to right')).toBeInTheDocument()
    expect(screen.getByText('Wrong side')).toBeInTheDocument()
    expect(runTexts()).toEqual(['●4 Red', '□1 Cream'])
    expect(onProgressChange).toHaveBeenLastCalledWith({ currentRow: 2, completedRows: [] })
  })

  it('stops at the first and last rows', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<FollowMode project={createProject()} onProgressChange={onProgressChange} />)
    expect(screen.getByRole('button', { name: 'Previous row' })).toBeDisabled()
    unmount()

    render(<FollowMode project={createProject({ currentRow: 60 })} onProgressChange={onProgressChange} />)
    expect(screen.getByRole('button', { name: 'Next row' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous row' }))
    expect(screen.getByText('Row 59 of 60')).toBeInTheDocument()
  })

  it('marks a row complete and moves to the next row', async () => {
    const user = userEvent.setup()
    render(<FollowMode project={createProject()} onProgressChange={onProgressChange} />)

    await user.click(screen.getByRole('button', { name: 'Complete row 1' }))

    expect(screen.getByText('Row 2 of 60')).toBeInTheDocument()
    expect(screen.getByText('1 of 60 rows done')).toBeInTheDocument()
    expect(onProgressChange).toHaveBeenLastCalledWith({ currentRow: 2, completedRows: [1] })
  })

  it('lets a completed row be reopened', async () => {
    const user = userEvent.setup()
    render(
      <FollowMode
        onProgressChange={onProgressChange}
        project={createProject({ currentRow: 2, completedRows: [1, 2] })}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Mark row 2 not done' }))

    expect(onProgressChange).toHaveBeenLastCalledWith({ currentRow: 2, completedRows: [1] })
  })

  it('restores the saved row', () => {
    render(
      <FollowMode
        onProgressChange={onProgressChange}
        project={createProject({ currentRow: 23, completedRows: [1, 2, 3] })}
      />
    )

    expect(screen.getByText('Row 23 of 60')).toBeInTheDocument()
    expect(screen.getByText('3 of 60 rows done')).toBeInTheDocument()
  })

  it('moves with arrow keys and completes with Space', async () => {
    const user = userEvent.setup()
    render(<FollowMode project={createProject()} onProgressChange={onProgressChange} />)

    await user.keyboard('{ArrowUp}')
    expect(screen.getByText('Row 2 of 60')).toBeInTheDocument()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByText('Row 1 of 60')).toBeInTheDocument()
    await user.keyboard(' ')
    expect(onProgressChange).toHaveBeenLastCalledWith({ currentRow: 2, completedRows: [1] })
  })

  it('exits with the close button', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    render(<FollowMode onExit={onExit} onProgressChange={onProgressChange} project={createProject()} />)

    await user.click(screen.getByRole('button', { name: 'Back to editor' }))
    expect(onExit).toHaveBeenCalled()
  })
})
