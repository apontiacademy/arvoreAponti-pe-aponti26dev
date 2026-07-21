import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Reorder } from 'framer-motion'
import type { Link } from '@/features/links/useLinks'

const updateMutate = vi.fn()
vi.mock('@/features/links/useUpdateLink', () => ({
  useUpdateLink: () => ({ mutate: updateMutate }),
}))

const deleteMutate = vi.fn()
vi.mock('@/features/links/useDeleteLink', () => ({
  useDeleteLink: () => ({ mutate: deleteMutate }),
}))

import { LinkBlockCard } from './LinkBlockCard'

function renderCard(link: Link) {
  return render(
    <Reorder.Group axis="y" values={[link.id]} onReorder={() => {}}>
      <LinkBlockCard link={link} />
    </Reorder.Group>,
  )
}

const baseLink = {
  id: 'link-1',
  page_id: 'page-1',
  order: 0,
  label: '',
  url: '',
  payload: {},
  is_active: true,
} as unknown as Link

describe('LinkBlockCard', () => {
  beforeEach(() => {
    updateMutate.mockReset()
    deleteMutate.mockReset()
  })

  it('renderiza campo de texto (sem URL) para o tipo titulo', () => {
    renderCard({ ...baseLink, type: 'title' })
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.queryByLabelText('URL')).not.toBeInTheDocument()
  })

  it('renderiza label e URL para o tipo link', () => {
    renderCard({ ...baseLink, type: 'link' })
    expect(screen.getByLabelText('Texto do botão')).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toBeInTheDocument()
  })

  it('autosalva as alteracoes apos o usuario parar de digitar', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'link' })

    await user.type(screen.getByLabelText('URL'), 'https://exemplo.com')

    await waitFor(() => expect(updateMutate).toHaveBeenCalled(), { timeout: 3000 })

    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'link-1',
        values: expect.objectContaining({ url: 'https://exemplo.com' }),
      }),
      expect.anything(),
    )
  })

  it('alterna o bloco entre ativo e inativo', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'link', is_active: true })

    await user.click(screen.getByRole('switch'))

    expect(updateMutate).toHaveBeenCalledWith({ id: 'link-1', values: { is_active: false } })
  })

  it('nao autosalva e exibe erro quando a URL e invalida apos o campo perder o foco', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'link' })

    const urlInput = screen.getByLabelText('URL')
    await user.type(urlInput, 'nao-e-uma-url')
    await user.tab()

    await screen.findByText('Informe uma URL válida (ex: https://...).')
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it('nao exibe erro de URL antes do campo perder o foco', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'email' })

    await user.type(screen.getByLabelText('Email'), 'nao-e-email')

    expect(screen.queryByText('Informe um email válido.')).not.toBeInTheDocument()
  })

  it('exclui o bloco apos confirmar no dialogo', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'link' })

    await user.click(screen.getByRole('button', { name: 'Excluir bloco' }))
    await user.click(await screen.findByRole('button', { name: /^excluir$/i }))

    expect(deleteMutate).toHaveBeenCalledWith({ id: 'link-1', pageId: 'page-1' })
  })

  it('exibe o switch Colapsável para blocos do tipo titulo, com o estado correto', () => {
    renderCard({ ...baseLink, type: 'title', payload: { collapsible: true } })

    const collapsibleSwitch = screen.getByRole('switch', { name: 'Colapsável' })
    expect(collapsibleSwitch).toBeInTheDocument()
    expect(collapsibleSwitch).toHaveAttribute('aria-checked', 'true')
  })

  it('nao exibe o switch Colapsável para tipos diferentes de titulo', () => {
    renderCard({ ...baseLink, type: 'link' })

    expect(screen.queryByRole('switch', { name: 'Colapsável' })).not.toBeInTheDocument()
  })

  it('alterna um bloco de titulo entre colapsavel e nao colapsavel', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'title', payload: {} })

    await user.click(screen.getByRole('switch', { name: 'Colapsável' }))

    expect(updateMutate).toHaveBeenCalledWith({
      id: 'link-1',
      values: { payload: { collapsible: true } },
    })
  })
})
