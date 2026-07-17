import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/lib/database.types'

type PageUpdate = TablesUpdate<'pages'>

export function useUpdatePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PageUpdate }) => {
      const { data, error } = await supabase
        .from('pages')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Tables<'pages'>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.setQueryData(['pages', 'detail', data.id], data)
    },
  })
}
