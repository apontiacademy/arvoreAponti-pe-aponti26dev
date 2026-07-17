import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PageAnalytics = {
  pageId: string
  title: string
  slug: string
  isPublished: boolean
  totalViews: number
  totalClicks: number
}

export function useAnalyticsSummary(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['analytics-summary', ownerId],
    queryFn: async (): Promise<PageAnalytics[]> => {
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('id, title, slug, is_published')
        .eq('owner_id', ownerId as string)

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
          totalViews: row?.total_views ?? 0,
          totalClicks: row?.total_clicks ?? 0,
        }
      })
    },
    enabled: Boolean(ownerId),
  })
}
