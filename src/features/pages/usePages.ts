import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Page = Tables<'pages'>

export function usePages(ownerId: string | undefined, options?: { allPages?: boolean }) {
  const allPages = options?.allPages ?? false

  return useQuery({
    queryKey: allPages ? ['pages', 'all'] : ['pages', ownerId],
    queryFn: async () => {
      const base = supabase.from('pages').select('*')
      const query = allPages ? base : base.eq('owner_id', ownerId as string)
      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: allPages || Boolean(ownerId),
  })
}
