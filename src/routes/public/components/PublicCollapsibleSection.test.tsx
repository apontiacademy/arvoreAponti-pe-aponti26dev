import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Link } from '@/features/links/useLinks'
import type { CollapsibleLinkSection } from '@/features/public/groupPublicLinks'
import { PublicCollapsibleSection } from './PublicCollapsibleSection'

vi.mock('./PublicLinkBlock', () => ({
  PublicLinkBlock: ({ link }: { link: { id: string; label: string | null } }) => (
    <div>{link.label ?? link.id}</div>
  ),
}))

function makeSection(): CollapsibleLinkSection {
  return {
    type: 'collapsible',
    title: { id: 'title-1', label: 'Treinos' } as Link,
    children: [
      { id: 'child-1', label: 'Goleiro' } as Link,
      { id: 'child-2', label: 'Drible' } as Link,
    ],
  }
}

describe('PublicCollapsibleSection', () => {
  it('mostra o titulo da secao e comeca fechada', () => {
    render(<PublicCollapsibleSection section={makeSection()} onInteract={vi.fn()} />)

    expect(screen.getByText('Treinos')).toBeInTheDocument()
    expect(screen.queryByText('Goleiro')).not.toBeInTheDocument()
    expect(screen.queryByText('Drible')).not.toBeInTheDocument()
  })

  it('abre e mostra os filhos ao clicar no gatilho', async () => {
    const user = userEvent.setup()
    render(<PublicCollapsibleSection section={makeSection()} onInteract={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ver mais/i }))

    expect(await screen.findByText('Goleiro')).toBeInTheDocument()
    expect(screen.getByText('Drible')).toBeInTheDocument()
  })

  it('fecha de novo ao clicar uma segunda vez', async () => {
    const user = userEvent.setup()
    render(<PublicCollapsibleSection section={makeSection()} onInteract={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: /ver mais/i })
    await user.click(trigger)
    await screen.findByText('Goleiro')
    await user.click(trigger)

    expect(screen.queryByText('Goleiro')).not.toBeInTheDocument()
  })
})
