import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useUpdateProfile } from './useUpdateProfile'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateProfile', () => {
  it('atualiza o display_name e a bio do perfil', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'user-1', display_name: 'Leandro', bio: 'Ola' },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() })
    result.current.mutate({ id: 'user-1', values: { display_name: 'Leandro', bio: 'Ola' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(update).toHaveBeenCalledWith({ display_name: 'Leandro', bio: 'Ola' })
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('propaga o erro quando o update falha', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('falhou') })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() })
    result.current.mutate({ id: 'user-1', values: { display_name: 'Leandro' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
