import { SidebarTrigger } from '@/components/ui/sidebar'
import { useSession } from '@/features/auth/useSession'

export function Topbar() {
  const { session } = useSession()

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">{session?.user.email}</span>
      </div>
    </header>
  )
}
