import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'page-1' }),
  }
})

const usePageMock = vi.fn()
vi.mock('@/features/pages/usePage', () => ({
  usePage: (id: string | undefined) => usePageMock(id),
}))

const updateMutate = vi.fn()
vi.mock('@/features/pages/useUpdatePage', () => ({
  useUpdatePage: () => ({ mutate: updateMutate }),
}))

const deleteMutate = vi.fn()
vi.mock('@/features/pages/useDeletePage', () => ({
  useDeletePage: () => ({ mutate: deleteMutate }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import PageEditPage from './PageEditPage'

function renderEdit() {
  return render(
    <MemoryRouter>
      <PageEditPage />
    </MemoryRouter>,
  )
}

const page = {
  id: 'page-1',
  owner_id: 'owner-1',
  title: 'Minha Árvore',
  slug: 'minha-arvore',
  description: '',
  is_published: false,
  theme_id: 'theme-1',
  settings: {},
  updated_at: '2026-07-10T00:00:00Z',
  created_at: '2026-07-01T00:00:00Z',
}

describe('PageEditPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    updateMutate.mockReset()
    updateMutate.mockImplementation((_args, callbacks) => callbacks?.onSuccess?.())
    deleteMutate.mockReset()
  })

  it('exibe skeleton enquanto carrega', () => {
    usePageMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderEdit()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe erro quando a pagina nao e encontrada', () => {
    usePageMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderEdit()
    expect(screen.getByText('Não foi possível carregar esta árvore.')).toBeInTheDocument()
  })

  it('preenche o formulario com os dados da pagina', () => {
    usePageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    renderEdit()
    expect(screen.getByLabelText('Título')).toHaveValue('Minha Árvore')
    expect(screen.getByLabelText('URL')).toHaveValue('minha-arvore')
  })

  it('autosalva as alteracoes apos o usuario parar de digitar', async () => {
    usePageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    const user = userEvent.setup()
    renderEdit()

    const titleInput = screen.getByLabelText('Título')
    await user.clear(titleInput)
    await user.type(titleInput, 'Novo Título')

    await waitFor(() => expect(updateMutate).toHaveBeenCalled(), { timeout: 3000 })

    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'page-1',
        values: expect.objectContaining({ title: 'Novo Título' }),
      }),
      expect.anything(),
    )
  })

  it('alterna publicacao pelo switch', async () => {
    usePageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    const user = userEvent.setup()
    renderEdit()

    await user.click(screen.getByRole('switch', { name: /publicada/i }))

    expect(updateMutate).toHaveBeenCalledWith(
      { id: 'page-1', values: { is_published: true } },
      expect.anything(),
    )
  })

  it('exclui a pagina apos confirmar e navega de volta para a lista', async () => {
    usePageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    deleteMutate.mockImplementation((_id, callbacks) => callbacks?.onSuccess?.())
    const user = userEvent.setup()
    renderEdit()

    await user.click(screen.getByRole('button', { name: /excluir árvore/i }))
    await user.click(await screen.findByRole('button', { name: /^excluir$/i }))

    expect(deleteMutate).toHaveBeenCalledWith('page-1', expect.anything())
    expect(navigateMock).toHaveBeenCalledWith('/pages', { replace: true })
  })
})
