import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ReorderLinksInput {
  pageId: string
  items: Array<{ id: string; order: number }>
}

export function useReorderLinks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ items }: ReorderLinksInput) => {
      const results = await Promise.all(
        items.map(({ id, order }) => supabase.from('links').update({ order }).eq('id', id)),
      )

      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['links', variables.pageId] })
    },
  })
}
