import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export type Role = 'user' | 'admin'

export function useSetUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      targetUserId,
      newRole,
    }: {
      targetUserId: string
      newRole: Role
    }) => {
      const { error } = await supabase.rpc('set_user_role', {
        target_user_id: targetUserId,
        new_role: newRole,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => {
      toast.error('Não foi possível atualizar o papel do usuário.')
    },
  })
}
