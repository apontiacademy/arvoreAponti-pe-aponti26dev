import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useCreatePage } from './useCreatePage'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function setupSupabaseMock(insertResult: { data?: unknown; error?: unknown }) {
  const insertMock = vi.fn(() => ({
    select: () => ({ single: () => Promise.resolve(insertResult) }),
  }))

  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'themes') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'theme-1' }, error: null }),
          }),
        }),
      } as never
    }
    if (table === 'pages') {
      return { insert: insertMock } as never
    }
    throw new Error(`unexpected table ${table}`)
  })

  return { insertMock }
}

describe('useCreatePage', () => {
  it('cria uma pagina com o tema minimal padrao', async () => {
    const { insertMock } = setupSupabaseMock({ data: { id: 'page-1' }, error: null })

    const { result } = renderHook(() => useCreatePage('owner-1'), { wrapper: createWrapper() })
    result.current.mutate({ title: 'Minha Árvore', slug: 'minha-arvore', description: '' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'owner-1',
        title: 'Minha Árvore',
        slug: 'minha-arvore',
        theme_id: 'theme-1',
      }),
    )
  })

  it('lanca erro quando nao ha usuario autenticado', async () => {
    const { result } = renderHook(() => useCreatePage(undefined), { wrapper: createWrapper() })
    result.current.mutate({ title: 'x', slug: 'x', description: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
