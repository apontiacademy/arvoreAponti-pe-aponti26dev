import { SiInstagram, SiSpotify, SiTelegram, SiTiktok, SiYoutube } from '@icons-pack/react-simple-icons'
import { resolveLinkHref } from '@/features/public/resolveLinkHref'
import type { Link } from '@/features/links/useLinks'

const ICON_COMPONENTS: Partial<Record<string, typeof SiInstagram>> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  telegram: SiTelegram,
  youtube: SiYoutube,
  spotify: SiSpotify,
}

interface PublicSocialIconsProps {
  icons: Link[]
  onInteract: (link: Link) => void
}

export function PublicSocialIcons({ icons, onInteract }: PublicSocialIconsProps) {
  return (
    <div className="flex items-center justify-center gap-5 pt-2">
      {icons.map((link) => {
        const Icon = ICON_COMPONENTS[link.type]
        const href = resolveLinkHref(link)
        if (!Icon || !href) return null

        return (
          <a
            key={link.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onInteract(link)}
            aria-label={link.type}
          >
            <Icon size={26} color="#ffffff" />
          </a>
        )
      })}
    </div>
  )
}
