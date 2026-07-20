import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const useSessionMock = vi.fn()
vi.mock('@/features/auth/useSession', () => ({
  useSession: () => useSessionMock(),
}))

const useAnalyticsSummaryMock = vi.fn()
vi.mock('@/features/analytics/useAnalyticsSummary', () => ({
  useAnalyticsSummary: (ownerId: string | undefined, options?: { allPages?: boolean }) =>
    useAnalyticsSummaryMock(ownerId, options),
}))

const useProfileMock = vi.fn(() => ({ data: { role: 'user' }, isLoading: false }))
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: () => useProfileMock(),
}))

const useUsersMock = vi.fn((_enabled?: boolean) => ({
  data: [] as Array<{ id: string; username: string }>,
}))
vi.mock('@/features/profiles/useUsers', () => ({
  useUsers: (enabled?: boolean) => useUsersMock(enabled),
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
    useProfileMock.mockReturnValue({ data: { role: 'user' }, isLoading: false })
    useUsersMock.mockReturnValue({ data: [] })
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

  it('mostra o dono de cada arvore no ranking quando o usuario logado e admin', async () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'owner-1', username: 'leandrobfd' },
        { id: 'owner-2', username: 'ana' },
      ],
    })
    useAnalyticsSummaryMock.mockReturnValue({
      data: [
        {
          pageId: 'page-1',
          title: 'Loja',
          slug: 'loja',
          isPublished: true,
          ownerId: 'owner-2',
          totalViews: 10,
          totalClicks: 4,
        },
      ],
      isLoading: false,
      isError: false,
    })

    renderPage()

    expect(await screen.findByText('por ana')).toBeInTheDocument()
  })
})
