import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { email: 'user@aponti.com' } }, isLoading: false, error: null }),
}))

import { Topbar } from './Topbar'

describe('Topbar', () => {
  it('exibe o email do usuario autenticado', () => {
    render(
      <SidebarProvider>
        <Topbar />
      </SidebarProvider>,
    )

    expect(screen.getByText('user@aponti.com')).toBeInTheDocument()
  })
})
