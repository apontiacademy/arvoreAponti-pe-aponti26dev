import { Fragment } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePage } from '@/features/pages/usePage'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pages: 'Árvores',
  new: 'Nova árvore',
  edit: 'Editar',
  analytics: 'Analytics',
  profile: 'Perfil',
  settings: 'Configurações',
}

export function Breadcrumb() {
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const { data: page } = usePage(params.id)

  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`
    const isPageId = Boolean(params.id) && segment === params.id
    const label = isPageId ? (page?.title ?? 'Carregando...') : (ROUTE_LABELS[segment] ?? segment)

    return { path, label, isLast: index === segments.length - 1 }
  })

  return (
    <BreadcrumbRoot className="border-b px-4 py-2">
      <BreadcrumbList>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.path}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={crumb.path} />}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  )
}
