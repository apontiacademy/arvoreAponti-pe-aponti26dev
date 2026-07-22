import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Link } from '@/features/links/useLinks'
import { PublicSocialIcons } from './PublicSocialIcons'

function link(overrides: Partial<Link>): Link {
  return {
    id: 'id',
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

describe('PublicSocialIcons', () => {
  it('renderiza um link por icone suportado, com o href resolvido', () => {
    render(
      <PublicSocialIcons
        icons={[link({ id: 'insta', type: 'instagram', url: 'meuuser' })]}
        onInteract={vi.fn()}
      />,
    )

    const anchor = screen.getByRole('link', { name: 'Instagram' })
    expect(anchor).toHaveAttribute('href', 'https://instagram.com/meuuser')
  })

  it('renderiza um link para cada tipo suportado', () => {
    render(
      <PublicSocialIcons
        icons={[
          link({ id: '1', type: 'instagram', url: 'a' }),
          link({ id: '2', type: 'tiktok', url: 'b' }),
          link({ id: '3', type: 'telegram', url: 'c' }),
          link({ id: '4', type: 'youtube', url: 'https://youtube.com/x' }),
          link({ id: '5', type: 'spotify', url: 'https://open.spotify.com/x' }),
        ]}
        onInteract={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('nao renderiza nada para um link sem url resolvivel', () => {
    render(
      <PublicSocialIcons icons={[link({ id: 'insta', type: 'instagram', url: null })]} onInteract={vi.fn()} />,
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('chama onInteract ao clicar', async () => {
    const user = userEvent.setup()
    const onInteract = vi.fn()
    const igLink = link({ id: 'insta', type: 'instagram', url: 'meuuser' })
    render(<PublicSocialIcons icons={[igLink]} onInteract={onInteract} />)

    await user.click(screen.getByRole('link'))

    expect(onInteract).toHaveBeenCalledWith(igLink)
  })
})
