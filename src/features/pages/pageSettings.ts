import type { Json } from '@/lib/database.types'

export type DescriptionAlign = 'left' | 'center'

export function getDescriptionAlign(settings: Json): DescriptionAlign {
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) return 'center'
  const value = (settings as Record<string, Json>).descriptionAlign
  return value === 'left' ? 'left' : 'center'
}

export function withDescriptionAlign(settings: Json, align: DescriptionAlign): Json {
  const base =
    typeof settings === 'object' && settings !== null && !Array.isArray(settings)
      ? (settings as Record<string, Json>)
      : {}
  return { ...base, descriptionAlign: align }
}
