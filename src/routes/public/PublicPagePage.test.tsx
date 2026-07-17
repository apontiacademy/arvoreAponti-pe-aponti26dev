import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ slug: 'minha-loja' }) }
})

const usePublicPageMock = vi.fn()
vi.mock('@/features/public/usePublicPage', () => ({
  usePublicPage: (slug: string | undefined) => usePublicPageMock(slug),
}))

const useLinksMock = vi.fn()
vi.mock('@/features/links/useLinks', () => ({
  useLinks: (pageId: string | undefined) => useLinksMock(pageId),
}))

const recordAnalyticsEventMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/features/public/analytics', () => ({
  recordAnalyticsEvent: (input: unknown) => recordAnalyticsEventMock(input),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('./components/PublicLinkBlock', () => ({
  PublicLinkBlock: ({
    link,
    onInteract,
  }: {
    link: { id: string; label: string | null }
    onInteract: (link: unknown) => void
  }) => (
    <button type="button" onClick={() => onInteract(link)}>
      {link.label}
    </button>
  ),
}))

import PublicPagePage from './PublicPagePage'

function renderPublicPage() {
  return render(
    <MemoryRouter>
      <PublicPagePage />
    </MemoryRouter>,
  )
}

const page = {
  id: 'page-1',
  title: 'Minha Loja',
  description: 'A melhor loja da cidade',
  slug: 'minha-loja',
}

describe('PublicPagePage', () => {
  beforeEach(() => {
    recordAnalyticsEventMock.mockClear()
    useLinksMock.mockReturnValue({ data: [], isLoading: false, isError: false })
  })

  it('exibe skeleton enquanto carrega', () => {
    usePublicPageMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderPublicPage()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe mensagem quando a pagina nao existe ou nao esta publicada', () => {
    usePublicPageMock.mockReturnValue({ data: null, isLoading: false, isError: false })
    renderPublicPage()
    expect(
      screen.getByText('Esta página não existe ou não está mais disponível.'),
    ).toBeInTheDocument()
  })

  it('renderiza o titulo, descricao e os blocos ativos da pagina', () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    useLinksMock.mockReturnValue({
      data: [
        { id: 'link-1', label: 'Meu link', is_active: true },
        { id: 'link-2', label: 'Inativo', is_active: false },
      ],
      isLoading: false,
      isError: false,
    })

    renderPublicPage()

    expect(screen.getByText('Minha Loja')).toBeInTheDocument()
    expect(screen.getByText('A melhor loja da cidade')).toBeInTheDocument()
    expect(screen.getByText('Meu link')).toBeInTheDocument()
    expect(screen.queryByText('Inativo')).not.toBeInTheDocument()
  })

  it('registra a visualizacao da pagina uma unica vez', () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })

    const { rerender } = renderPublicPage()
    rerender(
      <MemoryRouter>
        <PublicPagePage />
      </MemoryRouter>,
    )

    expect(recordAnalyticsEventMock).toHaveBeenCalledTimes(1)
    expect(recordAnalyticsEventMock).toHaveBeenCalledWith({ pageId: 'page-1', eventType: 'view' })
  })

  it('registra o clique ao interagir com um bloco', async () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    useLinksMock.mockReturnValue({
      data: [{ id: 'link-1', label: 'Meu link', is_active: true, type: 'link', url: 'x' }],
      isLoading: false,
      isError: false,
    })
    const user = userEvent.setup()
    renderPublicPage()

    await user.click(screen.getByRole('button', { name: 'Meu link' }))

    expect(recordAnalyticsEventMock).toHaveBeenCalledWith({
      pageId: 'page-1',
      linkId: 'link-1',
      eventType: 'click',
    })
  })
})
