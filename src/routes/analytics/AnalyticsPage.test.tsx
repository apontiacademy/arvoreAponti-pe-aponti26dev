import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const useSessionMock = vi.fn()
vi.mock('@/features/auth/useSession', () => ({
  useSession: () => useSessionMock(),
}))

const useAnalyticsSummaryMock = vi.fn()
vi.mock('@/features/analytics/useAnalyticsSummary', () => ({
  useAnalyticsSummary: (ownerId: string | undefined) => useAnalyticsSummaryMock(ownerId),
}))

import AnalyticsPage from './AnalyticsPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  )
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ session: { user: { id: 'owner-1' } } })
  })

  it('exibe skeleton enquanto carrega', () => {
    useAnalyticsSummaryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderPage()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe estado vazio quando nao ha arvores', () => {
    useAnalyticsSummaryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderPage()
    expect(screen.getByText('Você ainda não criou nenhuma árvore.')).toBeInTheDocument()
  })

  it('exibe erro quando a query falha', () => {
    useAnalyticsSummaryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByText('Não foi possível carregar as métricas.')).toBeInTheDocument()
  })

  it('exibe totais e o ranking de arvores por visualizacoes', () => {
    useAnalyticsSummaryMock.mockReturnValue({
      data: [
        {
          pageId: 'page-1',
          title: 'Loja A',
          slug: 'loja-a',
          isPublished: true,
          totalViews: 5,
          totalClicks: 2,
        },
        {
          pageId: 'page-2',
          title: 'Loja B',
          slug: 'loja-b',
          isPublished: false,
          totalViews: 20,
          totalClicks: 8,
        },
      ],
      isLoading: false,
      isError: false,
    })

    renderPage()

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Loja B')
    expect(items[1]).toHaveTextContent('Loja A')
    expect(
      screen.getByRole('link', { name: 'Ver página pública de Loja A' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Ver página pública de Loja B' }),
    ).not.toBeInTheDocument()
  })
})
