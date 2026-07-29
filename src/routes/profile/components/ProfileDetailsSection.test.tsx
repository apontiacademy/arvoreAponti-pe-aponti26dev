import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const updateMutate = vi.fn()
vi.mock('@/features/profiles/useUpdateProfile', () => ({
  useUpdateProfile: () => ({ mutate: updateMutate }),
}))

vi.mock('./ProfileAvatarUploader', () => ({
  ProfileAvatarUploader: ({ userId }: { userId: string }) => <div>Avatar de {userId}</div>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ProfileDetailsSection } from './ProfileDetailsSection'

const profile = {
  id: 'user-1',
  username: 'leandro',
  display_name: 'Leandro Carvalho',
  bio: 'Bio atual',
  avatar_url: null,
  role: 'user',
  created_at: '2026-01-01T00:00:00Z',
}

describe('ProfileDetailsSection', () => {
  it('preenche os campos com os valores atuais do perfil', () => {
    render(<ProfileDetailsSection profile={profile} />)

    expect(screen.getByLabelText('Nome')).toHaveValue('Leandro Carvalho')
    expect(screen.getByLabelText('Bio')).toHaveValue('Bio atual')
    expect(screen.getByText('Avatar de user-1')).toBeInTheDocument()
  })

  it('exibe erro quando o nome fica vazio', async () => {
    const user = userEvent.setup()
    render(<ProfileDetailsSection profile={profile} />)

    await user.clear(screen.getByLabelText('Nome'))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Informe seu nome')).toBeInTheDocument()
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it('salva o nome e a bio ao submeter', async () => {
    const user = userEvent.setup()
    render(<ProfileDetailsSection profile={profile} />)

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Novo Nome')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(updateMutate).toHaveBeenCalledWith(
      { id: 'user-1', values: { display_name: 'Novo Nome', bio: 'Bio atual' } },
      expect.anything(),
    )
  })
})
