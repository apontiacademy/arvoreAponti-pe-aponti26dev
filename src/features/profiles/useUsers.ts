import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<Tables<'profiles'>[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true })

      if (error) throw error
      return data
    },
  })
}
