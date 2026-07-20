import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('@/features/pages/usePage', () => ({
  usePage: () => ({ data: undefined }),
}))

import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renderiza sidebar, topbar e o conteudo da rota filha', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div>conteudo do dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('conteudo do dashboard')).toBeInTheDocument()
    await screen.findByRole('banner')
  })
})
