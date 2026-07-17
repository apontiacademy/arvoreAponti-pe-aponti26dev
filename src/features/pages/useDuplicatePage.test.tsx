import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Page } from './usePages'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useDuplicatePage } from './useDuplicatePage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function setupInsertSequence(results: Array<{ data?: unknown; error?: unknown }>) {
  let call = 0
  const insert = vi.fn(() => ({
    select: () => ({ single: () => Promise.resolve(results[call++]) }),
  }))
  vi.mocked(supabase.from).mockReturnValue({ insert } as never)
  return { insert }
}

const originalPage = {
  id: 'page-1',
  owner_id: 'owner-1',
  title: 'Original',
  slug: 'original',
  description: null,
  theme_id: 'theme-1',
  settings: {},
  is_published: true,
} as unknown as Page

describe('useDuplicatePage', () => {
  it('duplica a pagina com sufixo -copia e is_published false', async () => {
    const { insert } = setupInsertSequence([{ data: { id: 'page-2' }, error: null }])

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'original-copia', is_published: false }),
    )
  })

  it('tenta um novo slug quando ha conflito de unicidade', async () => {
    const { insert } = setupInsertSequence([
      { data: null, error: { code: '23505' } },
      { data: { id: 'page-3' }, error: null },
    ])

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(insert).toHaveBeenNthCalledWith(1, expect.objectContaining({ slug: 'original-copia' }))
    expect(insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ slug: 'original-copia-1' }),
    )
  })
})
