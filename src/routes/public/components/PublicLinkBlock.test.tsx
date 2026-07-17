import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Link } from '@/features/links/useLinks'
import { PublicLinkBlock } from './PublicLinkBlock'

function makeLink(overrides: Partial<Link>): Link {
  return {
    id: 'link-1',
    page_id: 'page-1',
    order: 0,
    label: null,
    url: null,
    payload: {},
    is_active: true,
    type: 'link',
    ...overrides,
  } as Link
}

describe('PublicLinkBlock', () => {
  it('renderiza um titulo para o tipo title', () => {
    render(
      <PublicLinkBlock link={makeLink({ type: 'title', label: 'Bem-vindo' })} onInteract={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeInTheDocument()
  })

  it('renderiza um paragrafo para o tipo text', () => {
    render(
      <PublicLinkBlock link={makeLink({ type: 'text', label: 'Alguma descrição' })} onInteract={vi.fn()} />,
    )
    expect(screen.getByText('Alguma descrição')).toBeInTheDocument()
  })

  it('renderiza uma imagem para o tipo image', () => {
    render(
      <PublicLinkBlock
        link={makeLink({ type: 'image', url: 'https://exemplo.com/foto.png', label: 'Foto' })}
        onInteract={vi.fn()}
      />,
    )
    expect(screen.getByRole('img', { name: 'Foto' })).toHaveAttribute(
      'src',
      'https://exemplo.com/foto.png',
    )
  })

  it('chama onInteract e copia a chave ao clicar em um bloco pix', async () => {
    const user = userEvent.setup()
    const onInteract = vi.fn()
    render(<PublicLinkBlock link={makeLink({ type: 'pix', url: 'chave@pix.com' })} onInteract={onInteract} />)

    await user.click(screen.getByRole('button'))

    expect(onInteract).toHaveBeenCalledWith(expect.objectContaining({ type: 'pix' }))
  })

  it('renderiza um link clicavel com o href resolvido', async () => {
    const onInteract = vi.fn()
    render(
      <PublicLinkBlock
        link={makeLink({ type: 'whatsapp', url: '5511999999999', label: 'Fale conosco' })}
        onInteract={onInteract}
      />,
    )

    const link = screen.getByRole('link', { name: 'Fale conosco' })
    expect(link).toHaveAttribute('href', 'https://wa.me/5511999999999')
  })
})
