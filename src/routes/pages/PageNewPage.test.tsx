import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'owner-1' } }, isLoading: false, error: null }),
}))

const createMutate = vi.fn()
vi.mock('@/features/pages/useCreatePage', () => ({
  useCreatePage: () => ({ mutate: createMutate }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import PageNewPage from './PageNewPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PageNewPage />
    </MemoryRouter>,
  )
}

describe('PageNewPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    createMutate.mockReset()
  })

  it('gera a URL automaticamente a partir do titulo', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Título'), 'Minha Árvore Ação')

    expect(screen.getByLabelText('URL')).toHaveValue('minha-arvore-acao')
  })

  it('para de sincronizar a URL apos edicao manual', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('URL'), 'url-customizada')
    await user.type(screen.getByLabelText('Título'), 'Outro Título')

    expect(screen.getByLabelText('URL')).toHaveValue('url-customizada')
  })

  it('navega para a edicao apos criar com sucesso', async () => {
    createMutate.mockImplementation((_values, { onSuccess }) => {
      onSuccess({ id: 'page-1' })
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Título'), 'Minha Árvore')
    await user.click(screen.getByRole('button', { name: /criar árvore/i }))

    expect(navigateMock).toHaveBeenCalledWith('/pages/page-1/edit', { replace: true })
  })

  it('mostra erro de URL em uso quando ha conflito', async () => {
    createMutate.mockImplementation((_values, { onError }) => {
      onError({ code: '23505' })
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Título'), 'Minha Árvore')
    await user.click(screen.getByRole('button', { name: /criar árvore/i }))

    expect(await screen.findByText('Essa URL já está em uso.')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
