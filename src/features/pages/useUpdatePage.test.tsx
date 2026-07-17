import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useUpdatePage } from './useUpdatePage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdatePage', () => {
  it('atualiza uma pagina pelo id', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'page-1', title: 'Novo' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUpdatePage(), { wrapper: createWrapper() })
    result.current.mutate({ id: 'page-1', values: { title: 'Novo' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('pages')
    expect(update).toHaveBeenCalledWith({ title: 'Novo' })
    expect(eq).toHaveBeenCalledWith('id', 'page-1')
    expect(result.current.data).toEqual({ id: 'page-1', title: 'Novo' })
  })
})
