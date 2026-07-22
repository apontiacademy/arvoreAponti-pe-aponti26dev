import { isCollapsibleTitle } from '@/features/links/linkPayload'
import type { Link } from '@/features/links/useLinks'

const ICON_TYPES = new Set(['instagram', 'tiktok', 'telegram', 'youtube', 'spotify'])

export interface PlainLinkSection {
  type: 'plain'
  link: Link
}

export interface CollapsibleLinkSection {
  type: 'collapsible'
  title: Link
  children: Link[]
}

export type PublicLinkSection = PlainLinkSection | CollapsibleLinkSection

export function groupPublicLinks(links: Link[]): {
  icons: Link[]
  sections: PublicLinkSection[]
} {
  const icons = links.filter((item) => ICON_TYPES.has(item.type))
  const flow = links.filter((item) => !ICON_TYPES.has(item.type))

  const sections: PublicLinkSection[] = []
  let current: CollapsibleLinkSection | null = null

  for (const item of flow) {
    if (item.type === 'title' && isCollapsibleTitle(item)) {
      current = { type: 'collapsible', title: item, children: [] }
      sections.push(current)
      continue
    }

    if (item.type === 'title') {
      current = null
    }

    if (current) {
      current.children.push(item)
    } else {
      sections.push({ type: 'plain', link: item })
    }
  }

  return {
    icons,
    sections: sections.filter((section) => section.type !== 'collapsible' || section.children.length > 0),
  }
}
