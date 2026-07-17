import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePage(id: string | undefined) {
  return useQuery({
    queryKey: ['pages', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('id', id as string)
        .single()

      if (error) throw error
      return data
    },
    enabled: Boolean(id),
  })
}
