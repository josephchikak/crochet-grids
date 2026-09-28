import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { siteMetadata } from '@/lib/metadata'
import { ConsentManager, consentStorageKey } from './consent-banner'

vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }))

describe('analytics consent', () => {
  beforeEach(() => {
    localStorage.clear()
    cleanup()
  })

  it('does not enable analytics until the user accepts', async () => {
    const user = userEvent.setup()
    render(<ConsentManager />)

    expect(await screen.findByText(/analytics is optional/i)).toBeInTheDocument()
    expect(document.querySelector('[data-analytics-consent="accepted"]')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept analytics' }))

    expect(localStorage.getItem(consentStorageKey)).toBe('accepted')
    expect(document.querySelector('[data-analytics-consent="accepted"]')).toBeInTheDocument()
  })

  it('stores a decline without affecting essential on-device saving', async () => {
    const user = userEvent.setup()
    render(<ConsentManager />)

    await user.click(await screen.findByRole('button', { name: 'Decline analytics' }))

    expect(localStorage.getItem(consentStorageKey)).toBe('declined')
    expect(document.querySelector('[data-analytics-consent]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analytics settings' })).toBeInTheDocument()
  })

  it('restores the choice and lets the user reopen settings', async () => {
    const user = userEvent.setup()
    localStorage.setItem(consentStorageKey, 'accepted')
    const firstRender = render(<ConsentManager />)

    await waitFor(() => expect(document.querySelector('[data-analytics-consent="accepted"]')).toBeInTheDocument())
    expect(screen.queryByText(/analytics is optional/i)).not.toBeInTheDocument()

    firstRender.unmount()
    render(<ConsentManager />)
    await user.click(await screen.findByRole('button', { name: 'Analytics settings' }))

    expect(screen.getByText(/analytics is optional/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline analytics' })).toBeInTheDocument()
  })
})

describe('site metadata', () => {
  it('publishes a descriptive title, canonical URL and social description', () => {
    expect(siteMetadata).toMatchObject({
      metadataBase: new URL('https://crochet-grids.vercel.app'),
      title: {
        default: 'Crochet Grids — Image to crochet chart maker',
        template: '%s — Crochet Grids'
      },
      description: expect.stringMatching(/single-crochet motif chart/i),
      alternates: { canonical: '/' }
    })
  })
})
