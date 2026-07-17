import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useReorderLinks } from './useReorderLinks'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useReorderLinks', () => {
  it('atualiza a ordem de cada link individualmente', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useReorderLinks(), { wrapper: createWrapper() })
    result.current.mutate({
      pageId: 'page-1',
      items: [
        { id: 'link-1', order: 0 },
        { id: 'link-2', order: 1 },
      ],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(update).toHaveBeenNthCalledWith(1, { order: 0 })
    expect(update).toHaveBeenNthCalledWith(2, { order: 1 })
    expect(eq).toHaveBeenNthCalledWith(1, 'id', 'link-1')
    expect(eq).toHaveBeenNthCalledWith(2, 'id', 'link-2')
  })
})
