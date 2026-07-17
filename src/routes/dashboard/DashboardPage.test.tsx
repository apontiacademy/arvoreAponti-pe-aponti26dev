import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'owner-1' } }, isLoading: false, error: null }),
}))

const usePagesMock = vi.fn()
vi.mock('@/features/pages/usePages', () => ({
  usePages: (ownerId: string | undefined) => usePagesMock(ownerId),
}))

import DashboardPage from './DashboardPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  it('exibe skeletons enquanto os dados carregam', () => {
    usePagesMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    const { container } = renderDashboard()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe estado vazio quando nao ha arvores', () => {
    usePagesMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    renderDashboard()

    expect(screen.getByText('Você ainda não criou nenhuma árvore.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar primeira árvore/i })).toBeInTheDocument()
  })

  it('exibe estatisticas e arvores recentes quando ha dados', () => {
    usePagesMock.mockReturnValue({
      data: [
        {
          id: '1',
          title: 'Minha Arvore',
          is_published: true,
          updated_at: '2026-07-10T00:00:00Z',
        },
        {
          id: '2',
          title: 'Rascunho Novo',
          is_published: false,
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
    })

    renderDashboard()

    expect(screen.getByText('Minha Arvore')).toBeInTheDocument()
    expect(screen.getByText('Rascunho Novo')).toBeInTheDocument()
    expect(screen.getByText('Publicada')).toBeInTheDocument()
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('exibe mensagem de erro quando a busca falha', () => {
    usePagesMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    renderDashboard()

    expect(screen.getByText('Não foi possível carregar suas árvores.')).toBeInTheDocument()
  })
})
