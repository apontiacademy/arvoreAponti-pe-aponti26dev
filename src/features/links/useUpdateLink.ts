import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/lib/database.types'

type LinkUpdate = TablesUpdate<'links'>

export function useUpdateLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LinkUpdate }) => {
      const { data, error } = await supabase
        .from('links')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Tables<'links'>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['links', data.page_id] })
    },
  })
}
