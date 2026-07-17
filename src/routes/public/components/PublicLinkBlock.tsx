import { LINK_TYPE_MAP, type LinkType } from '@/features/links/linkTypes'
import { resolveLinkHref, isCopyOnlyLink } from '@/features/public/resolveLinkHref'
import type { Link } from '@/features/links/useLinks'

interface PublicLinkBlockProps {
  link: Link
  onInteract: (link: Link) => void
}

const buttonClassName =
  'block w-full rounded-xl bg-card px-4 py-3 text-center text-sm font-medium ring-1 ring-foreground/10 transition-transform hover:scale-[1.02]'

export function PublicLinkBlock({ link, onInteract }: PublicLinkBlockProps) {
  if (link.type === 'title') {
    return <h2 className="pt-2 text-center text-lg font-semibold">{link.label}</h2>
  }

  if (link.type === 'text') {
    return <p className="text-center text-sm text-muted-foreground">{link.label}</p>
  }

  if (link.type === 'image') {
    if (!link.url) return null
    return <img src={link.url} alt={link.label ?? ''} className="w-full rounded-xl object-cover" />
  }

  if (link.type === 'video') {
    if (!link.url) return null
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={link.url} controls className="w-full rounded-xl" />
    )
  }

  const config = LINK_TYPE_MAP[link.type as LinkType]
  const label = link.label || config?.label || link.type

  if (isCopyOnlyLink(link.type)) {
    return (
      <button type="button" onClick={() => onInteract(link)} className={buttonClassName}>
        {label}
      </button>
    )
  }

  const href = resolveLinkHref(link)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onInteract(link)}
      className={buttonClassName}
    >
      {label}
    </a>
  )
}
