import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import { useProfile } from '@/features/profiles/useProfile'
import { useUsers } from '@/features/profiles/useUsers'
import { useSetUserRole, type Role } from '@/features/profiles/useSetUserRole'
import type { Tables } from '@/lib/database.types'

type ProfileRow = Tables<'profiles'>

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
] as const

export default function SettingsPage() {
  const { session } = useSession()
  const { data: profile } = useProfile(session?.user.id)
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <AppearanceSection />
      {isAdmin && <UsersSection currentUserId={session?.user.id} />}
    </div>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>Escolha como o Aponti Link Center deve aparecer para você.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant={theme === value ? 'default' : 'outline'}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function UsersSection({ currentUserId }: { currentUserId: string | undefined }) {
  const { data: users, isLoading, isError } = useUsers(true)
  const setUserRole = useSetUserRole()
  const [userToDemote, setUserToDemote] = useState<ProfileRow | null>(null)

  function handleToggle(user: ProfileRow, checked: boolean) {
    if (checked) {
      setUserRole.mutate({ targetUserId: user.id, newRole: 'admin' })
      return
    }
    setUserToDemote(user)
  }

  function handleConfirmDemote() {
    if (!userToDemote) return
    setUserRole.mutate(
      { targetUserId: userToDemote.id, newRole: 'user' as Role },
      {
        onSuccess: () => setUserToDemote(null),
        onError: () => setUserToDemote(null),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Promova ou rebaixe o acesso de cada funcionário.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar os usuários.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {(users ?? []).map((user) => {
              const isCurrentUser = user.id === currentUserId
              return (
                <li key={user.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{user.username}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Básico'}
                    </Badge>
                    <Switch
                      checked={user.role === 'admin'}
                      onCheckedChange={(checked) => handleToggle(user, checked)}
                      disabled={isCurrentUser}
                      aria-label={
                        user.role === 'admin'
                          ? `Rebaixar ${user.username} para básico`
                          : `Promover ${user.username} para admin`
                      }
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={userToDemote !== null}
        onOpenChange={(open) => !open && setUserToDemote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebaixar administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de admin de &quot;{userToDemote?.username}
              &quot;? A pessoa passa a ver e editar só as próprias árvores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDemote}>
              Rebaixar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
