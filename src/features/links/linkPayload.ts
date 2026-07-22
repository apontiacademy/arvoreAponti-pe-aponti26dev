import type { Json } from '@/lib/database.types'
import type { Link } from './useLinks'

export function isCollapsibleTitle(link: Pick<Link, 'type' | 'payload'>): boolean {
  if (link.type !== 'title') return false
  const payload = link.payload
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false
  return (payload as Record<string, Json>).collapsible === true
}

export function withCollapsible(payload: Json, collapsible: boolean): Json {
  const base =
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, Json>)
      : {}
  return { ...base, collapsible }
}
