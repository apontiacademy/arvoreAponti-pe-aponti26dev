import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSession } from '@/features/auth/useSession'
import { usePages } from '@/features/pages/usePages'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export default function DashboardPage() {
  const { session } = useSession()
  const { data: pages, isLoading, isError } = usePages(session?.user.id)

  const total = pages?.length ?? 0
  const published = pages?.filter((page) => page.is_published).length ?? 0
  const drafts = total - published
  const recentPages = pages?.slice(0, 5) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas árvores de links.</p>
        </div>
        <Button render={<Link to="/pages/new" />} nativeButton={false}>
          <Plus className="size-4" />
          Nova árvore
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de árvores" value={total} isLoading={isLoading} />
        <StatCard label="Publicadas" value={published} isLoading={isLoading} />
        <StatCard label="Rascunhos" value={drafts} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Árvores recentes</CardTitle>
          <CardDescription>As últimas árvores criadas ou editadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar suas árvores.</p>
          ) : total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">Você ainda não criou nenhuma árvore.</p>
              <Button size="sm" render={<Link to="/pages/new" />} nativeButton={false}>
                <Plus className="size-4" />
                Criar primeira árvore
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentPages.map((page) => (
                <li key={page.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex flex-col">
                    <Link to={`/pages/${page.id}/edit`} className="font-medium hover:underline">
                      {page.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      Atualizado em {dateFormatter.format(new Date(page.updated_at))}
                    </span>
                  </div>
                  <Badge variant={page.is_published ? 'default' : 'secondary'}>
                    {page.is_published ? 'Publicada' : 'Rascunho'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  isLoading,
}: {
  label: string
  value: number
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-2xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}
