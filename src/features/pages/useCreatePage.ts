import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PageFormValues } from './pageSchema'

export function useCreatePage(ownerId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: PageFormValues) => {
      if (!ownerId) throw new Error('Usuário não autenticado')

      const { data: theme } = await supabase
        .from('themes')
        .select('id')
        .eq('slug', 'minimal')
        .single()

      const { data, error } = await supabase
        .from('pages')
        .insert({
          owner_id: ownerId,
          title: values.title,
          slug: values.slug,
          description: values.description || null,
          theme_id: theme?.id ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
  })
}
