import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import { AppProviders } from './providers'

function Probe() {
  const client = useQueryClient()
  return <div>{client ? 'query client disponivel' : 'sem query client'}</div>
}

describe('AppProviders', () => {
  it('disponibiliza um QueryClient para os componentes filhos', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )
    expect(screen.getByText('query client disponivel')).toBeInTheDocument()
  })
})
