import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const uploadMutate = vi.fn()
const uploadState = { isPending: false }
vi.mock('@/features/pages/useUploadPageAvatar', () => ({
  useUploadPageAvatar: () => ({ mutate: uploadMutate, get isPending() { return uploadState.isPending } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { AvatarUploader } from './AvatarUploader'

describe('AvatarUploader', () => {
  beforeEach(() => {
    uploadMutate.mockReset()
    uploadState.isPending = false
  })

  it('exibe a foto atual quando ha avatarUrl', () => {
    render(<AvatarUploader pageId="page-1" ownerId="owner-1" avatarUrl="https://exemplo.com/foto.png" />)

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://exemplo.com/foto.png')
  })

  it('nao exibe imagem quando nao ha avatarUrl', () => {
    render(<AvatarUploader pageId="page-1" ownerId="owner-1" avatarUrl={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('envia o arquivo selecionado pro hook de upload', async () => {
    const user = userEvent.setup()
    render(<AvatarUploader pageId="page-1" ownerId="owner-1" avatarUrl={null} />)

    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' })
    const input = screen.getByTestId('avatar-input')
    await user.upload(input, file)

    expect(uploadMutate).toHaveBeenCalledWith(
      { pageId: 'page-1', ownerId: 'owner-1', file },
      expect.anything(),
    )
  })
})
