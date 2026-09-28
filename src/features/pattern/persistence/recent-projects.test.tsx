import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecentProjects } from './recent-projects'
import { deleteProject, listProjects, ProjectStorageError, type ProjectSummary } from './project-repository'

vi.mock('./project-repository', async (importOriginal) => ({
  ...await importOriginal<typeof import('./project-repository')>(),
  listProjects: vi.fn(),
  deleteProject: vi.fn()
}))

const summaries: ProjectSummary[] = [
  { id: 'heart', name: 'Heart', width: 40, height: 32, updatedAt: '2026-09-27T10:00:00.000Z', isReadable: true },
  { id: 'broken', name: 'Old logo', width: 60, height: 60, updatedAt: '2026-09-01T10:00:00.000Z', isReadable: false }
]

describe('RecentProjects', () => {
  beforeEach(() => {
    vi.mocked(listProjects).mockReset()
    vi.mocked(deleteProject).mockReset().mockResolvedValue(undefined)
  })

  it('lists saved charts with dimensions, date and a continue link', async () => {
    vi.mocked(listProjects).mockResolvedValue(summaries)
    render(<RecentProjects />)

    const heart = (await screen.findByRole('heading', { name: 'Heart' })).closest('li')
    expect(heart).not.toBeNull()
    const item = within(heart as HTMLElement)
    expect(item.getByText('40 × 32 stitches · 27 Sept 2026')).toBeInTheDocument()
    expect(item.getByRole('link', { name: 'Continue Heart' })).toHaveAttribute('href', '/projects/heart')
  })

  it('marks unreadable charts and offers only deletion', async () => {
    vi.mocked(listProjects).mockResolvedValue(summaries)
    render(<RecentProjects />)

    const broken = (await screen.findByRole('heading', { name: 'Old logo' })).closest('li') as HTMLElement
    expect(within(broken).getByText(/can.t be opened/i)).toBeInTheDocument()
    expect(within(broken).queryByRole('link')).not.toBeInTheDocument()
    expect(within(broken).getByRole('button', { name: 'Delete Old logo' })).toBeInTheDocument()
  })

  it('asks for confirmation before deleting', async () => {
    const user = userEvent.setup()
    vi.mocked(listProjects).mockResolvedValue(summaries)
    render(<RecentProjects />)

    await user.click(await screen.findByRole('button', { name: 'Delete Heart' }))
    expect(deleteProject).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirm delete Heart' }))
    expect(deleteProject).toHaveBeenCalledWith('heart')
    expect(screen.queryByRole('heading', { name: 'Heart' })).not.toBeInTheDocument()
  })

  it('renders nothing when there are no saved charts', async () => {
    vi.mocked(listProjects).mockResolvedValue([])
    const { container } = render(<RecentProjects />)

    await vi.waitFor(() => expect(listProjects).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('warns when this browser cannot save charts', async () => {
    vi.mocked(listProjects).mockRejectedValue(new ProjectStorageError('unavailable'))
    render(<RecentProjects />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This browser isn't saving charts"
    )
  })
})
