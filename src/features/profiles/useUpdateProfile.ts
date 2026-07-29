import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/lib/database.types'

type ProfileUpdate = TablesUpdate<'profiles'>

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProfileUpdate }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Tables<'profiles'>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', data.id], data)
    },
  })
}
