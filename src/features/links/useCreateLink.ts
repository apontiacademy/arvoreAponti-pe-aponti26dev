import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LinkType } from './linkTypes'

interface CreateLinkInput {
  pageId: string
  type: LinkType
  order: number
}

export function useCreateLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pageId, type, order }: CreateLinkInput) => {
      const { data, error } = await supabase
        .from('links')
        .insert({ page_id: pageId, type, order })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['links', data.page_id] })
    },
  })
}
