import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const uploadMutate = vi.fn()
const uploadState = { isPending: false }
vi.mock('@/features/profiles/useUploadProfileAvatar', () => ({
  useUploadProfileAvatar: () => ({ mutate: uploadMutate, get isPending() { return uploadState.isPending } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ProfileAvatarUploader } from './ProfileAvatarUploader'

describe('ProfileAvatarUploader', () => {
  beforeEach(() => {
    uploadMutate.mockReset()
    uploadState.isPending = false
  })

  it('exibe a foto atual quando ha avatarUrl', () => {
    render(<ProfileAvatarUploader userId="user-1" avatarUrl="https://exemplo.com/foto.png" />)

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://exemplo.com/foto.png')
  })

  it('nao exibe imagem quando nao ha avatarUrl', () => {
    render(<ProfileAvatarUploader userId="user-1" avatarUrl={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('envia o arquivo selecionado pro hook de upload', async () => {
    const user = userEvent.setup()
    render(<ProfileAvatarUploader userId="user-1" avatarUrl={null} />)

    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' })
    const input = screen.getByTestId('profile-avatar-input')
    await user.upload(input, file)

    expect(uploadMutate).toHaveBeenCalledWith({ userId: 'user-1', file }, expect.anything())
  })
})
