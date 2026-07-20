import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('marca o link da rota atual como ativo', () => {
    render(
      <MemoryRouter initialEntries={['/pages']}>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /árvores/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute('aria-current')
  })

  it('lista todos os itens de navegacao', () => {
    render(
      <MemoryRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /árvores/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /configurações/i })).toBeInTheDocument()
  })

  it('permite sair pelo botao no rodape do menu lateral', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /sair/i }))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
