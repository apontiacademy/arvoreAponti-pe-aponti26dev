import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/useSession'
import { supabase } from '@/lib/supabase'

export function Topbar() {
  const { session } = useSession()

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <span className="text-sm text-muted-foreground">{session?.user.email}</span>
      <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
        <LogOut />
        Sair
      </Button>
    </header>
  )
}
