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
      let newPage

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
            avatar_url: page.avatar_url,
            is_published: false,
          })
          .select()
          .single()

        if (!error) {
          newPage = data
          break
        }

        if (error.code === UNIQUE_VIOLATION) {
          suffix += 1
          slug = `${page.slug}-copia-${suffix}`
          continue
        }

        throw error
      }

      const { data: links, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('page_id', page.id)
        .order('order', { ascending: true })

      if (linksError) throw linksError

      if (links && links.length > 0) {
        const { error: insertLinksError } = await supabase.from('links').insert(
          links.map((link) => ({
            page_id: newPage.id,
            type: link.type,
            label: link.label,
            url: link.url,
            payload: link.payload,
            order: link.order,
            is_active: link.is_active,
          })),
        )

        if (insertLinksError) throw insertLinksError
      }

      return newPage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}
