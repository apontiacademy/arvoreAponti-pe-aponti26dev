import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'user-1', email: 'leandro@aponti.org.br' } } }),
}))

const useProfileMock = vi.fn()
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: (userId: string | undefined) => useProfileMock(userId),
}))

vi.mock('./components/ProfileDetailsSection', () => ({
  ProfileDetailsSection: () => <div>Secao Perfil</div>,
}))
vi.mock('./components/PasswordSection', () => ({
  PasswordSection: () => <div>Secao Senha</div>,
}))
vi.mock('./components/AccountInfoSection', () => ({
  AccountInfoSection: () => <div>Secao Conta</div>,
}))

import ProfilePage from './ProfilePage'

describe('ProfilePage', () => {
  it('exibe skeleton enquanto carrega', () => {
    useProfileMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = render(<ProfilePage />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe mensagem de erro quando a busca falha', () => {
    useProfileMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<ProfilePage />)

    expect(screen.getByText('Não foi possível carregar seu perfil.')).toBeInTheDocument()
  })

  it('renderiza as tres secoes quando o perfil carrega', () => {
    useProfileMock.mockReturnValue({
      data: { id: 'user-1', username: 'leandro', role: 'user' },
      isLoading: false,
      isError: false,
    })
    render(<ProfilePage />)

    expect(screen.getByText('Secao Perfil')).toBeInTheDocument()
    expect(screen.getByText('Secao Senha')).toBeInTheDocument()
    expect(screen.getByText('Secao Conta')).toBeInTheDocument()
  })
})
