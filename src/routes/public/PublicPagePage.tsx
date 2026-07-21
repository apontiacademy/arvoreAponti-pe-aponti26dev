import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicPage } from '@/features/public/usePublicPage'
import { useLinks, type Link } from '@/features/links/useLinks'
import { recordAnalyticsEvent } from '@/features/public/analytics'
import { isCopyOnlyLink } from '@/features/public/resolveLinkHref'
import { groupPublicLinks } from '@/features/public/groupPublicLinks'
import { PublicLinkBlock } from './components/PublicLinkBlock'
import { PublicCollapsibleSection } from './components/PublicCollapsibleSection'
import { PublicSocialIcons } from './components/PublicSocialIcons'

const PAGE_GRADIENT = 'min-h-screen bg-[linear-gradient(160deg,#6518EA_0%,#AD7DFF_45%,#FFE796_100%)]'

export default function PublicPagePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: page, isLoading, isError } = usePublicPage(slug)
  const { data: links } = useLinks(page?.id)
  const viewedPageIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (page && viewedPageIdRef.current !== page.id) {
      viewedPageIdRef.current = page.id
      void recordAnalyticsEvent({ pageId: page.id, eventType: 'view' })
    }
  }, [page])

  function handleLinkInteract(link: Link) {
    if (!page) return
    void recordAnalyticsEvent({ pageId: page.id, linkId: link.id, eventType: 'click' })

    if (isCopyOnlyLink(link.type) && link.url) {
      navigator.clipboard?.writeText(link.url)
      toast.success('Chave Pix copiada!')
    }
  }

  if (isLoading) {
    return (
      <div className={PAGE_GRADIENT}>
        <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 p-6 pt-16">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !page) {
    return (
      <div className={PAGE_GRADIENT}>
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <p className="text-sm text-white/90">
            Esta página não existe ou não está mais disponível.
          </p>
        </div>
      </div>
    )
  }

  const activeLinks = (links ?? []).filter((link) => link.is_active)
  const { icons, sections } = groupPublicLinks(activeLinks)

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#6518EA_0%,#AD7DFF_45%,#FFE796_100%)]">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6 p-6 pt-16">
        {page.avatar_url && (
          <img
            src={page.avatar_url}
            alt={page.title}
            className="size-20 rounded-full object-cover shadow-lg"
          />
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold text-white">{page.title}</h1>
          {page.description && <p className="text-sm text-white/80">{page.description}</p>}
        </div>

        <div className="flex w-full flex-col gap-3">
          {sections.map((section) =>
            section.type === 'plain' ? (
              <PublicLinkBlock key={section.link.id} link={section.link} onInteract={handleLinkInteract} />
            ) : (
              <PublicCollapsibleSection
                key={section.title.id}
                section={section}
                onInteract={handleLinkInteract}
              />
            ),
          )}
        </div>

        {icons.length > 0 && <PublicSocialIcons icons={icons} onInteract={handleLinkInteract} />}
      </div>
    </div>
  )
}
