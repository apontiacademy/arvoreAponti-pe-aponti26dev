import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import { useChangePassword } from './useChangePassword'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useChangePassword', () => {
  it('chama supabase.auth.updateUser com a nova senha', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never)

    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() })
    result.current.mutate('novaSenha123')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'novaSenha123' })
  })

  it('propaga o erro quando o supabase retorna erro', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new Error('falhou'),
    } as never)

    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() })
    result.current.mutate('novaSenha123')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
