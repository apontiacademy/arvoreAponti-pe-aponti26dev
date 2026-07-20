import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useSetUserRole } from './useSetUserRole'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useSetUserRole', () => {
  it('chama a RPC set_user_role com os parametros corretos', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)

    const { result } = renderHook(() => useSetUserRole(), { wrapper: createWrapper() })
    result.current.mutate({ targetUserId: 'user-1', newRole: 'admin' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.rpc).toHaveBeenCalledWith('set_user_role', {
      target_user_id: 'user-1',
      new_role: 'admin',
    })
  })

  it('propaga erro quando a RPC falha', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'not authorized' },
    } as never)

    const { result } = renderHook(() => useSetUserRole(), { wrapper: createWrapper() })
    result.current.mutate({ targetUserId: 'user-1', newRole: 'admin' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
