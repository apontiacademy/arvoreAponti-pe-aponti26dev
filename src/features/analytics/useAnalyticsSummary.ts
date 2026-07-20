import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PageAnalytics = {
  pageId: string
  title: string
  slug: string
  isPublished: boolean
  ownerId: string
  totalViews: number
  totalClicks: number
}

export function useAnalyticsSummary(ownerId: string | undefined, options?: { allPages?: boolean }) {
  const allPages = options?.allPages ?? false

  return useQuery({
    queryKey: allPages ? ['analytics-summary', 'all'] : ['analytics-summary', ownerId],
    queryFn: async (): Promise<PageAnalytics[]> => {
      const pagesQuery = supabase.from('pages').select('id, title, slug, is_published, owner_id')
      const { data: pages, error: pagesError } = await (allPages
        ? pagesQuery
        : pagesQuery.eq('owner_id', ownerId as string))

      if (pagesError) throw pagesError

      const { data: summary, error: summaryError } = await supabase
        .from('analytics_summary')
        .select('*')

      if (summaryError) throw summaryError

      const summaryByPageId = new Map((summary ?? []).map((row) => [row.page_id, row]))

      return (pages ?? []).map((page) => {
        const row = summaryByPageId.get(page.id)
        return {
          pageId: page.id,
          title: page.title,
          slug: page.slug,
          isPublished: page.is_published,
          ownerId: page.owner_id,
          totalViews: row?.total_views ?? 0,
          totalClicks: row?.total_clicks ?? 0,
        }
      })
    },
    enabled: allPages || Boolean(ownerId),
  })
}
