import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSession } from '@/features/auth/useSession'
import { useCreatePage } from '@/features/pages/useCreatePage'
import { pageFormSchema, type PageFormValues } from '@/features/pages/pageSchema'
import { slugify } from '@/features/pages/slugify'

export default function PageNewPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const createPage = useCreatePage(session?.user.id)
  const [slugEdited, setSlugEdited] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: { title: '', slug: '', description: '' },
  })

  const title = watch('title')

  useEffect(() => {
    if (!slugEdited) {
      setValue('slug', slugify(title || ''))
    }
  }, [title, slugEdited, setValue])

  function onSubmit(values: PageFormValues) {
    createPage.mutate(values, {
      onSuccess: (page) => {
        toast.success('Árvore criada com sucesso.')
        navigate(`/pages/${page.id}/edit`, { replace: true })
      },
      onError: (error: unknown) => {
        const code = (error as { code?: string } | null)?.code
        if (code === '23505') {
          setError('slug', { message: 'Essa URL já está em uso.' })
          return
        }
        toast.error('Não foi possível criar a árvore.')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Nova árvore</h1>
        <p className="text-sm text-muted-foreground">Crie uma nova árvore de links.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
          <CardDescription>Você poderá adicionar links e personalizar depois.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">URL</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="slug"
                  {...register('slug', { onChange: () => setSlugEdited(true) })}
                />
              </div>
              {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar árvore'}
              </Button>
              <Button
                type="button"
                variant="outline"
                render={<Link to="/pages" />}
                nativeButton={false}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
