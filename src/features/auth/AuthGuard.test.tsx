import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import { AuthGuard } from './AuthGuard'

function renderWithRouter(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>tela de login</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<div>tela protegida</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthGuard', () => {
  it('redireciona para /login quando nao ha sessao', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)

    renderWithRouter(['/dashboard'])

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })

  it('renderiza a rota protegida quando ha sessao', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    } as never)

    renderWithRouter(['/dashboard'])

    expect(await screen.findByText('tela protegida')).toBeInTheDocument()
  })

  it('redireciona para /login quando getSession rejeita, sem travar em loading', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('network error'))

    renderWithRouter(['/dashboard'])

    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })
})
