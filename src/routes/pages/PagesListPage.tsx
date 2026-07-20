import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Copy, ExternalLink, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSession } from '@/features/auth/useSession'
import { usePages, type Page } from '@/features/pages/usePages'
import { useDuplicatePage } from '@/features/pages/useDuplicatePage'
import { useDeletePage } from '@/features/pages/useDeletePage'
import { useUpdatePage } from '@/features/pages/useUpdatePage'
import { useProfile } from '@/features/profiles/useProfile'
import { useUsers } from '@/features/profiles/useUsers'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function PagesListPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const { data: profile } = useProfile(session?.user.id)
  const isAdmin = profile?.role === 'admin'
  const { data: pages, isLoading, isError } = usePages(session?.user.id, { allPages: isAdmin })
  const { data: users } = useUsers(isAdmin)
  const usernameByOwnerId = new Map((users ?? []).map((user) => [user.id, user.username]))
  const duplicatePage = useDuplicatePage()
  const updatePage = useUpdatePage()
  const deletePage = useDeletePage()

  const [search, setSearch] = useState('')
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)

  const filteredPages = (pages ?? []).filter((page) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return page.title.toLowerCase().includes(term) || page.slug.toLowerCase().includes(term)
  })

  function handleDuplicate(page: Page) {
    duplicatePage.mutate(page, {
      onSuccess: () => toast.success('Árvore duplicada com sucesso.'),
      onError: () => toast.error('Não foi possível duplicar a árvore.'),
    })
  }

  function handleTogglePublish(page: Page) {
    updatePage.mutate(
      { id: page.id, values: { is_published: !page.is_published } },
      {
        onSuccess: () =>
          toast.success(page.is_published ? 'Árvore despublicada.' : 'Árvore publicada.'),
        onError: () => toast.error('Não foi possível atualizar a árvore.'),
      },
    )
  }

  function handleConfirmDelete() {
    if (!pageToDelete) return
    deletePage.mutate(pageToDelete.id, {
      onSuccess: () => {
        toast.success('Árvore excluída.')
        setPageToDelete(null)
      },
      onError: () => {
        toast.error('Não foi possível excluir a árvore.')
        setPageToDelete(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Árvores</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'Gerencie as árvores de todos os usuários.'
              : 'Gerencie todas as suas árvores de links.'}
          </p>
        </div>
        <Button render={<Link to="/pages/new" />} nativeButton={false}>
          <Plus className="size-4" />
          Nova árvore
        </Button>
      </div>

      <Input
        placeholder="Pesquisar por título ou URL..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
        aria-label="Pesquisar árvores"
      />

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar suas árvores.</p>
          ) : (pages ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Você ainda não criou nenhuma árvore.</p>
              <Button size="sm" render={<Link to="/pages/new" />} nativeButton={false}>
                <Plus className="size-4" />
                Criar primeira árvore
              </Button>
            </div>
          ) : filteredPages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma árvore encontrada para &quot;{search}&quot;.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {filteredPages.map((page) => (
                <li key={page.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <Link to={`/pages/${page.id}/edit`} className="truncate font-medium hover:underline">
                      {page.title}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      /{page.slug} · Atualizado em {dateFormatter.format(new Date(page.updated_at))}
                      {isAdmin && users && (
                        <>
                          {' · '}
                          <span>{`por ${usernameByOwnerId.get(page.owner_id) ?? 'desconhecido'}`}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={page.is_published ? 'default' : 'secondary'}>
                      {page.is_published ? 'Publicada' : 'Rascunho'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Ações para ${page.title}`}
                          />
                        }
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/pages/${page.id}/edit`)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!page.is_published}
                          onClick={() => window.open(`/${page.slug}`, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="size-4" />
                          Ver página pública
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                          <Copy className="size-4" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePublish(page)}>
                          {page.is_published ? 'Despublicar' : 'Publicar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setPageToDelete(page)}>
                          <Trash2 className="size-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pageToDelete !== null}
        onOpenChange={(open) => !open && setPageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir árvore</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{pageToDelete?.title}&quot;? Essa ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
