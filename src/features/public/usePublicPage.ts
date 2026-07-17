import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePublicPage(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug as string)
        .eq('is_published', true)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: Boolean(slug),
  })
}
