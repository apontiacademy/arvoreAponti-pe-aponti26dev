import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Tables } from '@/lib/database.types'

interface AccountInfoSectionProps {
  email: string | undefined
  profile: Tables<'profiles'>
}

export function AccountInfoSection({ email, profile }: AccountInfoSectionProps) {
  const memberSince = new Date(profile.created_at).toLocaleDateString('pt-BR')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conta</CardTitle>
        <CardDescription>Informações da sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Nome de usuário</span>
          <span>{profile.username}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Email</span>
          <span>{email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Papel</span>
          <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
            {profile.role === 'admin' ? 'Admin' : 'Básico'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Membro desde</span>
          <span>{memberSince}</span>
        </div>
      </CardContent>
    </Card>
  )
}
