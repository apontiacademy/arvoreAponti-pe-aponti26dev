import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useLinks } from './useLinks'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLinks', () => {
  it('busca os links de uma pagina ordenados por order', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'link-1' }], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const { result } = renderHook(() => useLinks('page-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('links')
    expect(eq).toHaveBeenCalledWith('page_id', 'page-1')
    expect(order).toHaveBeenCalledWith('order', { ascending: true })
    expect(result.current.data).toEqual([{ id: 'link-1' }])
  })

  it('nao executa a query quando nao ha pageId', () => {
    const { result } = renderHook(() => useLinks(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
