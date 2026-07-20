import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'owner-1' } }, isLoading: false, error: null }),
}))

const usePagesMock = vi.fn()
vi.mock('@/features/pages/usePages', () => ({
  usePages: (ownerId: string | undefined, options?: { allPages?: boolean }) =>
    usePagesMock(ownerId, options),
}))

const useProfileMock = vi.fn(() => ({ data: { role: 'user' }, isLoading: false }))
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: () => useProfileMock(),
}))

const useUsersMock = vi.fn(() => ({ data: [] as Array<{ id: string; username: string }> }))
vi.mock('@/features/profiles/useUsers', () => ({
  useUsers: () => useUsersMock(),
}))

const duplicateMutate = vi.fn()
vi.mock('@/features/pages/useDuplicatePage', () => ({
  useDuplicatePage: () => ({ mutate: duplicateMutate }),
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

import PagesListPage from './PagesListPage'

function renderList() {
  return render(
    <MemoryRouter>
      <PagesListPage />
    </MemoryRouter>,
  )
}

const pages = [
  {
    id: 'page-1',
    title: 'Minha Loja',
    slug: 'minha-loja',
    is_published: true,
    updated_at: '2026-07-10T00:00:00Z',
  },
  {
    id: 'page-2',
    title: 'Rascunho Novo',
    slug: 'rascunho-novo',
    is_published: false,
    updated_at: '2026-07-01T00:00:00Z',
  },
]

describe('PagesListPage', () => {
  beforeEach(() => {
    duplicateMutate.mockReset()
    updateMutate.mockReset()
    deleteMutate.mockReset()
    useProfileMock.mockReturnValue({ data: { role: 'user' }, isLoading: false })
    useUsersMock.mockReturnValue({ data: [] })
  })

  it('exibe skeletons enquanto carrega', () => {
    usePagesMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderList()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe estado vazio quando nao ha arvores', () => {
    usePagesMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    renderList()
    expect(screen.getByText('Você ainda não criou nenhuma árvore.')).toBeInTheDocument()
  })

  it('filtra as arvores pela busca', async () => {
    usePagesMock.mockReturnValue({ data: pages, isLoading: false, isError: false })
    const user = userEvent.setup()
    renderList()

    expect(screen.getByText('Minha Loja')).toBeInTheDocument()
    expect(screen.getByText('Rascunho Novo')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Pesquisar árvores'), 'loja')

    expect(screen.getByText('Minha Loja')).toBeInTheDocument()
    expect(screen.queryByText('Rascunho Novo')).not.toBeInTheDocument()
  })

  it('duplica uma arvore pelo menu de acoes', async () => {
    usePagesMock.mockReturnValue({ data: pages, isLoading: false, isError: false })
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole('button', { name: /ações para minha loja/i }))
    await user.click(await screen.findByRole('menuitem', { name: /duplicar/i }))

    expect(duplicateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'page-1' }),
      expect.anything(),
    )
  })

  it('alterna publicacao pelo menu de acoes', async () => {
    usePagesMock.mockReturnValue({ data: pages, isLoading: false, isError: false })
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole('button', { name: /ações para rascunho novo/i }))
    await user.click(await screen.findByRole('menuitem', { name: /^publicar$/i }))

    expect(updateMutate).toHaveBeenCalledWith(
      { id: 'page-2', values: { is_published: true } },
      expect.anything(),
    )
  })

  it('exclui uma arvore apos confirmar no dialogo', async () => {
    usePagesMock.mockReturnValue({ data: pages, isLoading: false, isError: false })
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole('button', { name: /ações para minha loja/i }))
    await user.click(await screen.findByRole('menuitem', { name: /excluir/i }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: /^excluir$/i }))

    expect(deleteMutate).toHaveBeenCalledWith('page-1', expect.anything())
  })

  it('mostra o dono de cada arvore quando o usuario logado e admin', async () => {
    useProfileMock.mockReturnValue({ data: { role: 'admin' }, isLoading: false })
    useUsersMock.mockReturnValue({
      data: [
        { id: 'owner-1', username: 'leandrobfd' },
        { id: 'owner-2', username: 'ana' },
      ],
    })
    usePagesMock.mockReturnValue({
      data: [
        {
          id: 'page-1',
          title: 'Minha Loja',
          slug: 'minha-loja',
          is_published: true,
          updated_at: '2026-07-10T00:00:00Z',
          owner_id: 'owner-2',
        },
      ],
      isLoading: false,
      isError: false,
    })

    renderList()

    expect(await screen.findByText('por ana')).toBeInTheDocument()
  })
})
