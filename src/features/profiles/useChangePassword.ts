import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}
