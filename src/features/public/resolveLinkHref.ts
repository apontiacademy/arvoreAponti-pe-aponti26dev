import type { Link } from '@/features/links/useLinks'

export function isCopyOnlyLink(type: string): boolean {
  return type === 'pix'
}

export function resolveLinkHref(link: Link): string | null {
  if (!link.url) return null

  switch (link.type) {
    case 'whatsapp': {
      const digits = link.url.replace(/\D/g, '')
      return digits ? `https://wa.me/${digits}` : null
    }
    case 'email':
      return `mailto:${link.url}`
    case 'phone':
      return `tel:${link.url}`
    case 'instagram':
      return toProfileUrl(link.url, 'https://instagram.com/')
    case 'tiktok':
      return toProfileUrl(link.url, 'https://tiktok.com/@')
    case 'telegram':
      return toProfileUrl(link.url, 'https://t.me/')
    case 'title':
    case 'text':
    case 'pix':
      return null
    default:
      return link.url
  }
}

function toProfileUrl(value: string, base: string): string {
  if (/^https?:\/\//i.test(value)) return value
  const handle = value.replace(/^@/, '')
  return `${base}${handle}`
}
