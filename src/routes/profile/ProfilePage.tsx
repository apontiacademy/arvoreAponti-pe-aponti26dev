import { useSession } from '@/features/auth/useSession'
import { useProfile } from '@/features/profiles/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileDetailsSection } from './components/ProfileDetailsSection'
import { PasswordSection } from './components/PasswordSection'
import { AccountInfoSection } from './components/AccountInfoSection'

export default function ProfilePage() {
  const { session } = useSession()
  const { data: profile, isLoading, isError } = useProfile(session?.user.id)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Perfil</h1>
      {isLoading ? (
        <div className="flex max-w-lg flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !profile ? (
        <p className="text-sm text-destructive">Não foi possível carregar seu perfil.</p>
      ) : (
        <div className="flex max-w-lg flex-col gap-6">
          <ProfileDetailsSection profile={profile} />
          <PasswordSection />
          <AccountInfoSection email={session?.user.email} profile={profile} />
        </div>
      )}
    </div>
  )
}
