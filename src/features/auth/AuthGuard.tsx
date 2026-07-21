import { Navigate, Outlet } from 'react-router-dom'
import { LumaSpin } from '@/components/ui/luma-spin'
import { useSession } from './useSession'

export function AuthGuard() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center">
        <LumaSpin />
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
