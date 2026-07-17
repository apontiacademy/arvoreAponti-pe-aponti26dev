import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { usePublicPage } from './usePublicPage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('usePublicPage', () => {
  it('busca uma pagina publicada pelo slug', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'page-1' }, error: null })
    const eqPublished = vi.fn(() => ({ maybeSingle }))
    const eqSlug = vi.fn(() => ({ eq: eqPublished }))
    const select = vi.fn(() => ({ eq: eqSlug }))
    vi.mocked(supabase.from).mockReturnValue({ select } as never)

    const { result } = renderHook(() => usePublicPage('minha-loja'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('pages')
    expect(eqSlug).toHaveBeenCalledWith('slug', 'minha-loja')
    expect(eqPublished).toHaveBeenCalledWith('is_published', true)
    expect(result.current.data).toEqual({ id: 'page-1' })
  })

  it('nao executa a query quando nao ha slug', () => {
    const { result } = renderHook(() => usePublicPage(undefined), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
