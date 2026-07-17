import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Page = Tables<'pages'>

export function usePages(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['pages', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('owner_id', ownerId as string)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: Boolean(ownerId),
  })
}
