import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useUpdateLink } from './useUpdateLink'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateLink', () => {
  it('atualiza um link pelo id', async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'link-1', page_id: 'page-1', label: 'Novo' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUpdateLink(), { wrapper: createWrapper() })
    result.current.mutate({ id: 'link-1', values: { label: 'Novo' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('links')
    expect(update).toHaveBeenCalledWith({ label: 'Novo' })
    expect(eq).toHaveBeenCalledWith('id', 'link-1')
  })
})
