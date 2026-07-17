import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/features/auth/useSession'
import { useAnalyticsSummary } from '@/features/analytics/useAnalyticsSummary'

export default function AnalyticsPage() {
  const { session } = useSession()
  const { data: pagesAnalytics, isLoading, isError } = useAnalyticsSummary(session?.user.id)

  const totalViews = pagesAnalytics?.reduce((sum, page) => sum + page.totalViews, 0) ?? 0
  const totalClicks = pagesAnalytics?.reduce((sum, page) => sum + page.totalClicks, 0) ?? 0
  const rankedPages = [...(pagesAnalytics ?? [])].sort((a, b) => b.totalViews - a.totalViews)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Visualizações e cliques registrados em todas as suas árvores.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total de visualizações" value={totalViews} isLoading={isLoading} />
        <StatCard label="Total de cliques" value={totalClicks} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por árvore</CardTitle>
          <CardDescription>Ordenado por mais visualizações.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar as métricas.</p>
          ) : rankedPages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Você ainda não criou nenhuma árvore.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {rankedPages.map((page) => (
                <li key={page.pageId} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/pages/${page.pageId}/edit`}
                      className="truncate font-medium hover:underline"
                    >
                      {page.title}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">/{page.slug}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="font-medium">{page.totalViews}</p>
                      <p className="text-xs text-muted-foreground">visualizações</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{page.totalClicks}</p>
                      <p className="text-xs text-muted-foreground">cliques</p>
                    </div>
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                      {page.isPublished ? 'Publicada' : 'Rascunho'}
                    </Badge>
                    {page.isPublished && (
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver página pública de ${page.title}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                  </div>
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
        {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-semibold">{value}</p>}
      </CardContent>
    </Card>
  )
}
