import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

const BUCKET = 'page-avatars'

export function useUploadPageAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pageId,
      ownerId,
      file,
    }: {
      pageId: string
      ownerId: string
      file: File
    }) => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${ownerId}/${pageId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { data, error } = await supabase
        .from('pages')
        .update({ avatar_url: publicUrl })
        .eq('id', pageId)
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
