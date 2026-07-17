import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useCreateLink } from './useCreateLink'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateLink', () => {
  it('cria um bloco do tipo informado na posicao indicada', async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'link-1', page_id: 'page-1' }, error: null })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    const { result } = renderHook(() => useCreateLink(), { wrapper: createWrapper() })
    result.current.mutate({ pageId: 'page-1', type: 'link', order: 2 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(insert).toHaveBeenCalledWith({ page_id: 'page-1', type: 'link', order: 2 })
  })
})
