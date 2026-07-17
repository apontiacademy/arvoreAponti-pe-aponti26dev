import { supabase } from '@/lib/supabase'
import { parseUserAgent } from './parseUserAgent'

interface RecordAnalyticsEventInput {
  pageId: string
  linkId?: string
  eventType: 'view' | 'click'
}

export async function recordAnalyticsEvent({
  pageId,
  linkId,
  eventType,
}: RecordAnalyticsEventInput) {
  const { device, os, browser } = parseUserAgent(navigator.userAgent)

  await supabase.from('analytics').insert({
    page_id: pageId,
    link_id: linkId ?? null,
    event_type: eventType,
    device,
    os,
    browser,
    referrer: document.referrer || null,
  })
}
