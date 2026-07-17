import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('./parseUserAgent', () => ({
  parseUserAgent: () => ({ device: 'mobile', os: 'iOS', browser: 'Safari' }),
}))

import { supabase } from '@/lib/supabase'
import { recordAnalyticsEvent } from './analytics'

describe('recordAnalyticsEvent', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      configurable: true,
    })
  })

  it('registra um evento de view com os dados de dispositivo e referrer', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await recordAnalyticsEvent({ pageId: 'page-1', eventType: 'view' })

    expect(supabase.from).toHaveBeenCalledWith('analytics')
    expect(insert).toHaveBeenCalledWith({
      page_id: 'page-1',
      link_id: null,
      event_type: 'view',
      device: 'mobile',
      os: 'iOS',
      browser: 'Safari',
      referrer: 'https://google.com',
    })
  })

  it('registra um evento de click com o link_id informado', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ insert } as never)

    await recordAnalyticsEvent({ pageId: 'page-1', linkId: 'link-1', eventType: 'click' })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ page_id: 'page-1', link_id: 'link-1', event_type: 'click' }),
    )
  })
})
