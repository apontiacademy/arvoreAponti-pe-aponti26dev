import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

const BUCKET = 'profile-avatars'

export function useUploadProfileAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
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
