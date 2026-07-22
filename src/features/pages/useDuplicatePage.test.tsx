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

function setupSupabase({
  pageInsertResults,
  existingLinks = [],
}: {
  pageInsertResults: Array<{ data?: unknown; error?: unknown }>
  existingLinks?: unknown[]
}) {
  let call = 0
  const pagesInsert = vi.fn(() => ({
    select: () => ({ single: () => Promise.resolve(pageInsertResults[call++]) }),
  }))
  const linksInsert = vi.fn().mockResolvedValue({ error: null })
  const linksSelect = vi.fn(() => ({
    eq: () => ({
      order: () => Promise.resolve({ data: existingLinks, error: null }),
    }),
  }))

  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'pages') return { insert: pagesInsert } as never
    if (table === 'links') return { select: linksSelect, insert: linksInsert } as never
    throw new Error(`unexpected table ${table}`)
  })

  return { pagesInsert, linksInsert, linksSelect }
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
  avatar_url: 'https://exemplo.com/avatar.png',
} as unknown as Page

describe('useDuplicatePage', () => {
  it('duplica a pagina com sufixo -copia e is_published false', async () => {
    const { pagesInsert, linksInsert } = setupSupabase({
      pageInsertResults: [{ data: { id: 'page-2' }, error: null }],
    })

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(pagesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'original-copia', is_published: false }),
    )
    expect(linksInsert).not.toHaveBeenCalled()
  })

  it('tenta um novo slug quando ha conflito de unicidade', async () => {
    const { pagesInsert } = setupSupabase({
      pageInsertResults: [
        { data: null, error: { code: '23505' } },
        { data: { id: 'page-3' }, error: null },
      ],
    })

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(pagesInsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ slug: 'original-copia' }),
    )
    expect(pagesInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ slug: 'original-copia-1' }),
    )
  })

  it('duplica os links da pagina original para a nova pagina', async () => {
    const { linksInsert, linksSelect } = setupSupabase({
      pageInsertResults: [{ data: { id: 'page-2' }, error: null }],
      existingLinks: [
        {
          id: 'link-1',
          page_id: 'page-1',
          type: 'link',
          label: 'Meu site',
          url: 'https://exemplo.com',
          payload: {},
          order: 0,
          is_active: true,
        },
        {
          id: 'link-2',
          page_id: 'page-1',
          type: 'title',
          label: 'Bem-vindo',
          url: null,
          payload: {},
          order: 1,
          is_active: false,
        },
      ],
    })

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(linksSelect).toHaveBeenCalled()
    expect(linksInsert).toHaveBeenCalledWith([
      {
        page_id: 'page-2',
        type: 'link',
        label: 'Meu site',
        url: 'https://exemplo.com',
        payload: {},
        order: 0,
        is_active: true,
      },
      {
        page_id: 'page-2',
        type: 'title',
        label: 'Bem-vindo',
        url: null,
        payload: {},
        order: 1,
        is_active: false,
      },
    ])
  })

  it('copia o avatar_url da pagina original', async () => {
    const { pagesInsert } = setupSupabase({
      pageInsertResults: [{ data: { id: 'page-2' }, error: null }],
    })

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(pagesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: 'https://exemplo.com/avatar.png' }),
    )
  })
})
