import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Link = Tables<'links'>

export function useLinks(pageId: string | undefined) {
  return useQuery({
    queryKey: ['links', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('page_id', pageId as string)
        .order('order', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: Boolean(pageId),
  })
}
