import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import { useUploadPageAvatar } from './useUploadPageAvatar'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeFile() {
  return new File(['conteudo'], 'foto.png', { type: 'image/png' })
}

describe('useUploadPageAvatar', () => {
  it('sobe o arquivo, pega a url publica e atualiza avatar_url', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/x/page-1.png' } })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload, getPublicUrl } as never)

    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'page-1', avatar_url: 'https://cdn/x/page-1.png' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUploadPageAvatar(), { wrapper: createWrapper() })
    result.current.mutate({ pageId: 'page-1', ownerId: 'owner-1', file: makeFile() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.storage.from).toHaveBeenCalledWith('page-avatars')
    expect(upload).toHaveBeenCalledWith('owner-1/page-1.png', expect.any(File), { upsert: true })
    expect(getPublicUrl).toHaveBeenCalledWith('owner-1/page-1.png')
    expect(update).toHaveBeenCalledWith({ avatar_url: 'https://cdn/x/page-1.png' })
    expect(eq).toHaveBeenCalledWith('id', 'page-1')
  })

  it('propaga o erro quando o upload falha, sem tentar atualizar a pagina', async () => {
    const upload = vi.fn().mockResolvedValue({ error: new Error('falhou') })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never)
    const update = vi.fn()
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUploadPageAvatar(), { wrapper: createWrapper() })
    result.current.mutate({ pageId: 'page-1', ownerId: 'owner-1', file: makeFile() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(update).not.toHaveBeenCalled()
  })
})
