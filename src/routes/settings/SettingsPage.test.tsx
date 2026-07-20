import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'admin-1' } }, isLoading: false, error: null }),
}))

const useProfileMock = vi.fn(() => ({
  data: { role: 'user' } as { role: string; id?: string },
  isLoading: false,
}))
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: () => useProfileMock(),
}))

const useUsersMock = vi.fn(() => ({
  data: [] as Array<{ id: string; username: string; role: string }>,
  isLoading: false,
  isError: false,
}))
vi.mock('@/features/profiles/useUsers', () => ({
  useUsers: () => useUsersMock(),
}))

const setRoleMutate = vi.fn()
vi.mock('@/features/profiles/useSetUserRole', () => ({
  useSetUserRole: () => ({ mutate: setRoleMutate }),
}))

import SettingsPage from './SettingsPage'

beforeEach(() => {
  useProfileMock.mockReturnValue({ data: { role: 'user' }, isLoading: false })
  useUsersMock.mockReturnValue({ data: [], isLoading: false, isError: false })
  setRoleMutate.mockClear()
})

describe('SettingsPage', () => {
  it('nao mostra a secao de usuarios para quem nao e admin', () => {
    render(<SettingsPage />)
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument()
  })

  it('mostra a lista de usuarios para admin, com o papel de cada um', () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'admin-1', username: 'leandrobfd', role: 'admin' },
        { id: 'user-1', username: 'ana', role: 'user' },
      ],
      isLoading: false,
      isError: false,
    })

    render(<SettingsPage />)

    expect(screen.getByText('Usuários')).toBeInTheDocument()
    expect(screen.getByText('leandrobfd')).toBeInTheDocument()
    expect(screen.getByText('ana')).toBeInTheDocument()
  })

  it('desabilita o controle de papel na propria linha do admin logado', () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'admin-1', username: 'leandrobfd', role: 'admin' },
        { id: 'user-1', username: 'ana', role: 'user' },
      ],
      isLoading: false,
      isError: false,
    })

    render(<SettingsPage />)

    const switches = screen.getAllByRole('switch')
    const ownSwitch = switches.find((element) =>
      element.getAttribute('aria-label')?.includes('leandrobfd'),
    )
    // The shared `Switch` primitive (Base UI) always renders its interactive
    // root as a <span role="switch">, never a native <button>/<input>, so
    // jest-dom's toBeDisabled() (which only recognizes the HTML `disabled`
    // attribute on real form-tag elements) can never observe it here. Assert
    // on aria-disabled instead — the actual mechanism this component uses.
    expect(ownSwitch).toHaveAttribute('aria-disabled', 'true')
  })

  it('promove um usuario basico direto, sem confirmacao', async () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [{ id: 'user-1', username: 'ana', role: 'user' }],
      isLoading: false,
      isError: false,
    })

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('switch', { name: /ana/i }))

    expect(setRoleMutate).toHaveBeenCalledWith({ targetUserId: 'user-1', newRole: 'admin' })
  })

  it('pede confirmacao antes de rebaixar um admin', async () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin', id: 'admin-1' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'admin-1', username: 'leandrobfd', role: 'admin' },
        { id: 'user-2', username: 'outro-admin', role: 'admin' },
      ],
      isLoading: false,
      isError: false,
    })

    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('switch', { name: /outro-admin/i }))

    expect(setRoleMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /rebaixar/i }))

    expect(setRoleMutate).toHaveBeenCalledWith(
      { targetUserId: 'user-2', newRole: 'user' },
      expect.anything(),
    )
  })
})
