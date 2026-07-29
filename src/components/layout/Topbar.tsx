import { Link } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/useSession'
import { useProfile } from '@/features/profiles/useProfile'

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function Topbar() {
  const { session } = useSession()
  const { data: profile, isLoading, isError } = useProfile(session?.user.id)
  const label = profile ? profile.display_name || profile.username : ''

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-end gap-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : isError || !profile ? (
          <span className="text-sm text-muted-foreground">{session?.user.email}</span>
        ) : (
          <Button
            variant="ghost"
            className="h-auto gap-2 px-2 py-1"
            render={<Link to="/profile" />}
            nativeButton={false}
          >
            <Avatar size="sm">
              <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{getInitials(label)}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{label}</span>
          </Button>
        )}
      </div>
    </header>
  )
}
