import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Reorder } from 'framer-motion'
import { ArrowLeft, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePage } from '@/features/pages/usePage'
import { useUpdatePage } from '@/features/pages/useUpdatePage'
import { useDeletePage } from '@/features/pages/useDeletePage'
import { pageFormSchema, type PageFormValues } from '@/features/pages/pageSchema'
import { useLinks } from '@/features/links/useLinks'
import { useCreateLink } from '@/features/links/useCreateLink'
import { useReorderLinks } from '@/features/links/useReorderLinks'
import { LINK_TYPES } from '@/features/links/linkTypes'
import { LinkBlockCard } from './components/LinkBlockCard'
import { AvatarUploader } from './components/AvatarUploader'

const AUTOSAVE_DELAY_MS = 800

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: page, isLoading, isError } = usePage(id)
  const updatePage = useUpdatePage()
  const deletePage = useDeletePage()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedSnapshotRef = useRef<string | null>(null)

  const { data: links, isLoading: isLoadingLinks } = useLinks(page?.id)
  const createLink = useCreateLink()
  const reorderLinks = useReorderLinks()
  const [orderedIds, setOrderedIds] = useState<string[]>([])

  useEffect(() => {
    if (links) {
      setOrderedIds(links.map((link) => link.id))
    }
  }, [links])

  const {
    register,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: { title: '', slug: '', description: '' },
  })

  useEffect(() => {
    if (page) {
      const initial = { title: page.title, slug: page.slug, description: page.description ?? '' }
      reset(initial)
      savedSnapshotRef.current = JSON.stringify(initial)
    }
  }, [page, reset])

  const title = watch('title')
  const slug = watch('slug')
  const description = watch('description')

  useEffect(() => {
    if (!page || savedSnapshotRef.current === null) return

    const current = { title, slug, description: description || '' }
    const serialized = JSON.stringify(current)
    if (serialized === savedSnapshotRef.current) return

    const result = pageFormSchema.safeParse(current)
    if (!result.success) return

    setSaveStatus('saving')
    const timeout = setTimeout(() => {
      updatePage.mutate(
        {
          id: page.id,
          values: {
            title: result.data.title,
            slug: result.data.slug,
            description: result.data.description || null,
          },
        },
        {
          onSuccess: () => {
            savedSnapshotRef.current = serialized
            setSaveStatus('saved')
          },
          onError: (error: unknown) => {
            const code = (error as { code?: string } | null)?.code
            if (code === '23505') {
              setError('slug', { message: 'Essa URL já está em uso.' })
            }
            setSaveStatus('error')
          },
        },
      )
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, description, page])

  function handleTogglePublish(checked: boolean) {
    if (!page) return
    updatePage.mutate(
      { id: page.id, values: { is_published: checked } },
      {
        onSuccess: () => toast.success(checked ? 'Árvore publicada.' : 'Árvore despublicada.'),
        onError: () => toast.error('Não foi possível atualizar a árvore.'),
      },
    )
  }

  function handleDelete() {
    if (!page) return
    deletePage.mutate(page.id, {
      onSuccess: () => {
        toast.success('Árvore excluída.')
        navigate('/pages', { replace: true })
      },
      onError: () => toast.error('Não foi possível excluir a árvore.'),
    })
  }

  function handleAddLink(type: (typeof LINK_TYPES)[number]['type']) {
    if (!page) return
    createLink.mutate(
      { pageId: page.id, type, order: orderedIds.length },
      { onError: () => toast.error('Não foi possível adicionar o bloco.') },
    )
  }

  function handlePersistOrder(newOrder: string[]) {
    if (!page) return
    reorderLinks.mutate(
      { pageId: page.id, items: newOrder.map((linkId, index) => ({ id: linkId, order: index })) },
      { onError: () => toast.error('Não foi possível salvar a nova ordem dos blocos.') },
    )
  }

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !page) {
    return <p className="text-sm text-destructive">Não foi possível carregar esta árvore.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link to="/pages" />}
            nativeButton={false}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Editar árvore</h1>
            <p className="text-sm text-muted-foreground">
              {saveStatus === 'saving' && 'Salvando...'}
              {saveStatus === 'saved' && 'Todas as alterações foram salvas.'}
              {saveStatus === 'error' && 'Erro ao salvar. Tente novamente.'}
              {saveStatus === 'idle' && 'As alterações são salvas automaticamente.'}
            </p>
          </div>
        </div>
        <a
          href={page.is_published ? `/${page.slug}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!page.is_published}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <ExternalLink className="size-4" />
          Ver página pública
        </a>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
          <CardDescription>Título, URL e descrição da árvore.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader pageId={page.id} ownerId={page.owner_id} avatarUrl={page.avatar_url} />
          <form className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">URL</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input id="slug" {...register('slug')} />
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
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex flex-col">
                <Label htmlFor="published">Publicada</Label>
                <span className="text-xs text-muted-foreground">
                  Torna a árvore visível publicamente em /{page.slug}
                </span>
              </div>
              <Switch
                id="published"
                checked={page.is_published}
                onCheckedChange={handleTogglePublish}
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Blocos</CardTitle>
              <CardDescription>Links, redes sociais e outros conteúdos da árvore.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" />}>
                <Plus className="size-4" />
                Adicionar
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LINK_TYPES.map(({ type, label, icon: TypeIcon }) => (
                  <DropdownMenuItem key={type} onClick={() => handleAddLink(type)}>
                    <TypeIcon className="size-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingLinks ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : orderedIds.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum bloco ainda. Adicione links, redes sociais ou outros conteúdos.
            </p>
          ) : (
            <Reorder.Group
              axis="y"
              values={orderedIds}
              onReorder={setOrderedIds}
              className="flex flex-col gap-2"
            >
              {orderedIds.map((linkId) => {
                const link = links?.find((item) => item.id === linkId)
                if (!link) return null
                return (
                  <LinkBlockCard
                    key={link.id}
                    link={link}
                    onDragEnd={() => handlePersistOrder(orderedIds)}
                  />
                )
              })}
            </Reorder.Group>
          )}
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" className="w-fit" />}>
          <Trash2 className="size-4" />
          Excluir árvore
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir árvore</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{page.title}&quot;? Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
