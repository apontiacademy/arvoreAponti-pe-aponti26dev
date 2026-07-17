import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useDeletePage } from './useDeletePage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDeletePage', () => {
  it('exclui uma pagina pelo id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ delete: del } as never)

    const { result } = renderHook(() => useDeletePage(), { wrapper: createWrapper() })
    result.current.mutate('page-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('pages')
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', 'page-1')
  })
})
