import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'user@aponti.com' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import { Topbar } from './Topbar'

describe('Topbar', () => {
  it('exibe o email do usuario autenticado e permite sair', async () => {
    const user = userEvent.setup()
    render(
      <SidebarProvider>
        <Topbar />
      </SidebarProvider>,
    )

    expect(await screen.findByText('user@aponti.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sair/i }))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
