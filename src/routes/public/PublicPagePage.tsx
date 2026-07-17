import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicPage } from '@/features/public/usePublicPage'
import { useLinks, type Link } from '@/features/links/useLinks'
import { recordAnalyticsEvent } from '@/features/public/analytics'
import { isCopyOnlyLink } from '@/features/public/resolveLinkHref'
import { PublicLinkBlock } from './components/PublicLinkBlock'

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
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-4 p-6 pt-16">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (isError || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Esta página não existe ou não está mais disponível.
        </p>
      </div>
    )
  }

  const activeLinks = (links ?? []).filter((link) => link.is_active)

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-6 p-6 pt-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold">{page.title}</h1>
        {page.description && <p className="text-sm text-muted-foreground">{page.description}</p>}
      </div>

      <div className="flex w-full flex-col gap-3">
        {activeLinks.map((link) => (
          <PublicLinkBlock key={link.id} link={link} onInteract={handleLinkInteract} />
        ))}
      </div>
    </div>
  )
}
