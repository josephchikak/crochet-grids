import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Home', () => {
  it('presents the crochet-chart value and primary action', () => {
    render(<Home />)

    expect(screen.getByRole('heading', {
      name: /turn any image into a crochet-ready chart/i
    })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create a pattern/i }))
      .toHaveAttribute('href', '/create')
  })
})
