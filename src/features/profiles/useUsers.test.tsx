import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useUsers } from './useUsers'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUsers', () => {
  it('lista todos os perfis ordenados por username', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'user-1', username: 'ana', role: 'user' },
        { id: 'user-2', username: 'leandrobfd', role: 'admin' },
      ],
      error: null,
    })
    const select = vi.fn(() => ({ order }))
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(order).toHaveBeenCalledWith('username', { ascending: true })
    expect(result.current.data).toHaveLength(2)
  })

  it('nao executa a query quando enabled e false', () => {
    const { result } = renderHook(() => useUsers(false), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
