import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { usePages } from './usePages'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function setupSupabaseMock(result: { data?: unknown; error?: unknown }) {
  const order = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq, order }))
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
  return { select, eq, order }
}

describe('usePages', () => {
  it('busca as paginas do dono ordenadas por atualizacao', async () => {
    const { eq, order } = setupSupabaseMock({ data: [{ id: '1' }], error: null })

    const { result } = renderHook(() => usePages('owner-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('pages')
    expect(eq).toHaveBeenCalledWith('owner_id', 'owner-1')
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result.current.data).toEqual([{ id: '1' }])
  })

  it('nao executa a query quando nao ha ownerId', () => {
    const { result } = renderHook(() => usePages(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('busca todas as paginas sem filtrar por dono quando allPages e true', async () => {
    const { eq, order } = setupSupabaseMock({ data: [{ id: '1' }, { id: '2' }], error: null })

    const { result } = renderHook(() => usePages(undefined, { allPages: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(eq).not.toHaveBeenCalled()
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }])
  })
})
