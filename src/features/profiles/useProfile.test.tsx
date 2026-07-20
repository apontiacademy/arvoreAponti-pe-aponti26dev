import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useProfile } from './useProfile'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useProfile', () => {
  it('busca o perfil do usuario pelo id', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'user-1', username: 'leandrobfd', role: 'admin' },
      error: null,
    })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const { result } = renderHook(() => useProfile('user-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
    expect(result.current.data).toEqual({ id: 'user-1', username: 'leandrobfd', role: 'admin' })
  })

  it('nao executa a query quando nao ha userId', () => {
    const { result } = renderHook(() => useProfile(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
