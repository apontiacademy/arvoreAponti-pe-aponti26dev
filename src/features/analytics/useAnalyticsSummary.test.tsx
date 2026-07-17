import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useAnalyticsSummary } from './useAnalyticsSummary'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function mockSupabaseTables({
  pages,
  summary,
}: {
  pages: unknown[]
  summary: unknown[]
}) {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'pages') {
      const eq = vi.fn().mockResolvedValue({ data: pages, error: null })
      return { select: vi.fn(() => ({ eq })) } as never
    }
    if (table === 'analytics_summary') {
      return { select: vi.fn().mockResolvedValue({ data: summary, error: null }) } as never
    }
    throw new Error(`unexpected table ${table}`)
  })
}

describe('useAnalyticsSummary', () => {
  it('combina paginas do dono com o resumo de analytics, usando 0 quando nao ha eventos', async () => {
    mockSupabaseTables({
      pages: [
        { id: 'page-1', title: 'Loja', slug: 'loja', is_published: true },
        { id: 'page-2', title: 'Rascunho', slug: 'rascunho', is_published: false },
      ],
      summary: [{ page_id: 'page-1', total_views: 10, total_clicks: 4 }],
    })

    const { result } = renderHook(() => useAnalyticsSummary('owner-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([
      {
        pageId: 'page-1',
        title: 'Loja',
        slug: 'loja',
        isPublished: true,
        totalViews: 10,
        totalClicks: 4,
      },
      {
        pageId: 'page-2',
        title: 'Rascunho',
        slug: 'rascunho',
        isPublished: false,
        totalViews: 0,
        totalClicks: 0,
      },
    ])
  })

  it('nao executa a query quando nao ha ownerId', () => {
    const { result } = renderHook(() => useAnalyticsSummary(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
