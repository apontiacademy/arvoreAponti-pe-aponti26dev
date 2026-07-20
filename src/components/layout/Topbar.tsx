import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'

export function Topbar() {
  const { session } = useSession()

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">{session?.user.email}</span>
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => supabase.auth.signOut()}>
          <LogOut />
          Sair
        </Button>
      </div>
    </header>
  )
}
