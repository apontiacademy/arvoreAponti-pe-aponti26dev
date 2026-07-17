import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Page } from './usePages'

const UNIQUE_VIOLATION = '23505'

export function useDuplicatePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (page: Page) => {
      let suffix = 0
      let slug = `${page.slug}-copia`

      while (true) {
        const { data, error } = await supabase
          .from('pages')
          .insert({
            owner_id: page.owner_id,
            title: `${page.title} (cópia)`,
            slug,
            description: page.description,
            theme_id: page.theme_id,
            settings: page.settings,
            is_published: false,
          })
          .select()
          .single()

        if (!error) return data

        if (error.code === UNIQUE_VIOLATION) {
          suffix += 1
          slug = `${page.slug}-copia-${suffix}`
          continue
        }

        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}
