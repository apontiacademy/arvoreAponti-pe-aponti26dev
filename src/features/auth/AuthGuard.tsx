import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './useSession'

export function AuthGuard() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return <div role="status">Carregando...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
