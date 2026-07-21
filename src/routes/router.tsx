import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LumaSpin } from '@/components/ui/luma-spin'
import { AuthGuard } from '@/features/auth/AuthGuard'

const LoginPage = lazy(() => import('./login/LoginPage'))
const DashboardPage = lazy(() => import('./dashboard/DashboardPage'))
const PagesListPage = lazy(() => import('./pages/PagesListPage'))
const PageNewPage = lazy(() => import('./pages/PageNewPage'))
const PageEditPage = lazy(() => import('./pages/PageEditPage'))
const AnalyticsPage = lazy(() => import('./analytics/AnalyticsPage'))
const ProfilePage = lazy(() => import('./profile/ProfilePage'))
const SettingsPage = lazy(() => import('./settings/SettingsPage'))
const PublicPagePage = lazy(() => import('./public/PublicPagePage'))
const NotFoundPage = lazy(() => import('./not-found/NotFoundPage'))

function withSuspense(element: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-screen items-center justify-center">
          <LumaSpin />
          <span className="sr-only">Carregando...</span>
        </div>
      }
    >
      {element}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/:slug', element: withSuspense(<PublicPagePage />) },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/pages', element: withSuspense(<PagesListPage />) },
          { path: '/pages/new', element: withSuspense(<PageNewPage />) },
          { path: '/pages/:id/edit', element: withSuspense(<PageEditPage />) },
          { path: '/analytics', element: withSuspense(<AnalyticsPage />) },
          { path: '/profile', element: withSuspense(<ProfilePage />) },
          { path: '/settings', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '*', element: withSuspense(<NotFoundPage />) },
])
