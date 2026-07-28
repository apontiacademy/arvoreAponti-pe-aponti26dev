import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpdateProfile } from '@/features/profiles/useUpdateProfile'
import type { Tables } from '@/lib/database.types'
import { ProfileAvatarUploader } from './ProfileAvatarUploader'

const profileDetailsSchema = z.object({
  display_name: z.string().min(1, 'Informe seu nome'),
  bio: z.string().max(280, 'Máximo de 280 caracteres').optional(),
})

type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>

interface ProfileDetailsSectionProps {
  profile: Tables<'profiles'>
}

export function ProfileDetailsSection({ profile }: ProfileDetailsSectionProps) {
  const updateProfile = useUpdateProfile()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
    },
  })

  function onSubmit(values: ProfileDetailsValues) {
    updateProfile.mutate(
      { id: profile.id, values: { display_name: values.display_name, bio: values.bio || null } },
      {
        onSuccess: () => toast.success('Perfil atualizado.'),
        onError: () => toast.error('Não foi possível atualizar o perfil.'),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Sua foto, nome de exibição e uma breve bio.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ProfileAvatarUploader userId={profile.id} avatarUrl={profile.avatar_url} />
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display_name">Nome</Label>
            <Input id="display_name" {...register('display_name')} />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" {...register('bio')} />
            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting || updateProfile.isPending}>
              {isSubmitting || updateProfile.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
