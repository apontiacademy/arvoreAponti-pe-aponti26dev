import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({
    session: { user: { id: 'user-1', email: 'user@aponti.com' } },
    isLoading: false,
    error: null,
  }),
}))

const useProfileMock = vi.fn()
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: (userId: string | undefined) => useProfileMock(userId),
}))

import { Topbar } from './Topbar'

function renderTopbar() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <Topbar />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

describe('Topbar', () => {
  it('exibe o nome de exibicao e as iniciais como avatar', () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        username: 'leandro',
        display_name: 'Leandro Carvalho',
        avatar_url: null,
      },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.getByText('Leandro Carvalho')).toBeInTheDocument()
    expect(screen.getByText('LC')).toBeInTheDocument()
  })

  it('usa o username quando display_name e nulo', () => {
    useProfileMock.mockReturnValue({
      data: { id: 'user-1', username: 'leandro', display_name: null, avatar_url: null },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.getByText('leandro')).toBeInTheDocument()
  })

  it('o link aponta para /profile', () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        username: 'leandro',
        display_name: 'Leandro Carvalho',
        avatar_url: null,
      },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.getByRole('button', { name: /leandro carvalho/i })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('exibe skeleton enquanto o perfil carrega', () => {
    useProfileMock.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = renderTopbar()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('nao exibe mais o email cru', () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        username: 'leandro',
        display_name: 'Leandro Carvalho',
        avatar_url: null,
      },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.queryByText('user@aponti.com')).not.toBeInTheDocument()
  })
})
