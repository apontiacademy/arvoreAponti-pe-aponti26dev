# Página de Perfil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder de `ProfilePage` por uma tela real onde o usuário edita nome/bio/avatar, troca a própria senha, e vê email/papel/data de criação somente leitura.

**Architecture:** Três `Card`s independentes (`ProfileDetailsSection`, `PasswordSection`, `AccountInfoSection`), cada um com sua própria mutation, compostos em `ProfilePage.tsx` — mesmo padrão de `SettingsPage.tsx` (`AppearanceSection`/`UsersSection`). Três novos hooks em `src/features/profiles/` seguindo os padrões já usados por `useUpdatePage`/`useUploadPageAvatar`. Um novo bucket Storage `profile-avatars` segue o padrão hardened já usado por `page-avatars`.

**Tech Stack:** React 19 + TypeScript, TanStack Query v5, react-hook-form + Zod, Supabase (Postgres + Storage + Auth), Tailwind v4, shadcn/ui (base-nova), Vitest + Testing Library.

Spec de referência: `docs/superpowers/specs/2026-07-28-pagina-perfil-design.md`

---

### Task 1: Migração do bucket `profile-avatars`

> **Nota de execução:** esta task aplica uma migração no projeto Supabase compartilhado (`arvore-aponti`, org Aponti) via as ferramentas MCP do Supabase — não há Supabase CLI local neste projeto (gap conhecido, ver `CLAUDE.md`). Por mexer em infraestrutura compartilhada, deve ser executada diretamente pelo agente coordenador (não por um subagente implementador dispatchado às cegas).

**Files:**
- Create: `supabase/migrations/20260728000000_profile_avatars_storage.sql`
- Modify: `src/lib/database.types.ts` (regenerado, não editado à mão)

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- Bucket de avatar de perfil (um por usuário, path "{user_id}/avatar.{ext}").
-- Segue o mesmo padrao hardened de page-avatars (20260721000000/20260721000001),
-- mas sem a logica de "so pagina publicada" -- profiles nao tem esse conceito.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "profile_avatars_public_read"
on storage.objects for select
using (bucket_id = 'profile-avatars');

create policy "profile_avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_avatars_admin_all"
on storage.objects for all
using (bucket_id = 'profile-avatars' and is_admin())
with check (bucket_id = 'profile-avatars' and is_admin());
```

- [ ] **Step 2: Aplicar a migração no projeto remoto**

Usar a ferramenta MCP do Supabase `apply_migration` (projeto `arvore-aponti`) com o nome `profile_avatars_storage` e o SQL acima.

- [ ] **Step 3: Confirmar que o bucket existe**

Usar `list_tables`/uma query `select * from storage.buckets where id = 'profile-avatars'` (via `execute_sql`) para confirmar que o bucket foi criado com `file_size_limit = 5242880` e os 5 `allowed_mime_types`.

Expected: uma linha retornada com esses valores.

- [ ] **Step 4: Regenerar os tipos TypeScript**

Usar a ferramenta MCP `generate_typescript_types` do Supabase e sobrescrever `src/lib/database.types.ts` com o resultado.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260728000000_profile_avatars_storage.sql src/lib/database.types.ts
git commit -m "feat: adiciona bucket profile-avatars no Supabase Storage"
```

---

### Task 2: Hook `useUpdateProfile`

**Files:**
- Create: `src/features/profiles/useUpdateProfile.ts`
- Test: `src/features/profiles/useUpdateProfile.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '@/lib/supabase'
import { useUpdateProfile } from './useUpdateProfile'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useUpdateProfile', () => {
  it('atualiza o display_name e a bio do perfil', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'user-1', display_name: 'Leandro', bio: 'Ola' },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() })
    result.current.mutate({ id: 'user-1', values: { display_name: 'Leandro', bio: 'Ola' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(update).toHaveBeenCalledWith({ display_name: 'Leandro', bio: 'Ola' })
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('propaga o erro quando o update falha', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('falhou') })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUpdateProfile(), { wrapper: createWrapper() })
    result.current.mutate({ id: 'user-1', values: { display_name: 'Leandro' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- useUpdateProfile.test.tsx`
Expected: FAIL — `Cannot find module './useUpdateProfile'`.

- [ ] **Step 3: Implementar o hook**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/lib/database.types'

type ProfileUpdate = TablesUpdate<'profiles'>

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProfileUpdate }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Tables<'profiles'>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', data.id], data)
    },
  })
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- useUpdateProfile.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/profiles/useUpdateProfile.ts src/features/profiles/useUpdateProfile.test.tsx
git commit -m "feat: adiciona hook useUpdateProfile"
```

---

### Task 3: Hook `useUploadProfileAvatar`

**Files:**
- Create: `src/features/profiles/useUploadProfileAvatar.ts`
- Test: `src/features/profiles/useUploadProfileAvatar.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import { useUploadProfileAvatar } from './useUploadProfileAvatar'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeFile() {
  return new File(['conteudo'], 'foto.png', { type: 'image/png' })
}

describe('useUploadProfileAvatar', () => {
  it('sobe o arquivo, pega a url publica e atualiza avatar_url', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/user-1/avatar.png' } })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload, getPublicUrl } as never)

    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'user-1', avatar_url: 'https://cdn/user-1/avatar.png' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUploadProfileAvatar(), { wrapper: createWrapper() })
    result.current.mutate({ userId: 'user-1', file: makeFile() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.storage.from).toHaveBeenCalledWith('profile-avatars')
    expect(upload).toHaveBeenCalledWith('user-1/avatar.png', expect.any(File), { upsert: true })
    expect(getPublicUrl).toHaveBeenCalledWith('user-1/avatar.png')
    expect(update).toHaveBeenCalledWith({ avatar_url: 'https://cdn/user-1/avatar.png' })
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('propaga o erro quando o upload falha, sem tentar atualizar o perfil', async () => {
    const upload = vi.fn().mockResolvedValue({ error: new Error('falhou') })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never)
    const update = vi.fn()
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUploadProfileAvatar(), { wrapper: createWrapper() })
    result.current.mutate({ userId: 'user-1', file: makeFile() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- useUploadProfileAvatar.test.tsx`
Expected: FAIL — `Cannot find module './useUploadProfileAvatar'`.

- [ ] **Step 3: Implementar o hook**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

const BUCKET = 'profile-avatars'

export function useUploadProfileAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data as Tables<'profiles'>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', data.id], data)
    },
  })
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- useUploadProfileAvatar.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/profiles/useUploadProfileAvatar.ts src/features/profiles/useUploadProfileAvatar.test.tsx
git commit -m "feat: adiciona hook useUploadProfileAvatar"
```

---

### Task 4: Hook `useChangePassword`

**Files:**
- Create: `src/features/profiles/useChangePassword.ts`
- Test: `src/features/profiles/useChangePassword.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import { useChangePassword } from './useChangePassword'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useChangePassword', () => {
  it('chama supabase.auth.updateUser com a nova senha', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never)

    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() })
    result.current.mutate('novaSenha123')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'novaSenha123' })
  })

  it('propaga o erro quando o supabase retorna erro', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new Error('falhou'),
    } as never)

    const { result } = renderHook(() => useChangePassword(), { wrapper: createWrapper() })
    result.current.mutate('novaSenha123')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- useChangePassword.test.tsx`
Expected: FAIL — `Cannot find module './useChangePassword'`.

- [ ] **Step 3: Implementar o hook**

```ts
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- useChangePassword.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/profiles/useChangePassword.ts src/features/profiles/useChangePassword.test.tsx
git commit -m "feat: adiciona hook useChangePassword"
```

---

### Task 5: Componente `ProfileAvatarUploader`

**Files:**
- Create: `src/routes/profile/components/ProfileAvatarUploader.tsx`
- Test: `src/routes/profile/components/ProfileAvatarUploader.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const uploadMutate = vi.fn()
const uploadState = { isPending: false }
vi.mock('@/features/profiles/useUploadProfileAvatar', () => ({
  useUploadProfileAvatar: () => ({ mutate: uploadMutate, get isPending() { return uploadState.isPending } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ProfileAvatarUploader } from './ProfileAvatarUploader'

describe('ProfileAvatarUploader', () => {
  beforeEach(() => {
    uploadMutate.mockReset()
    uploadState.isPending = false
  })

  it('exibe a foto atual quando ha avatarUrl', () => {
    render(<ProfileAvatarUploader userId="user-1" avatarUrl="https://exemplo.com/foto.png" />)

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://exemplo.com/foto.png')
  })

  it('nao exibe imagem quando nao ha avatarUrl', () => {
    render(<ProfileAvatarUploader userId="user-1" avatarUrl={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('envia o arquivo selecionado pro hook de upload', async () => {
    const user = userEvent.setup()
    render(<ProfileAvatarUploader userId="user-1" avatarUrl={null} />)

    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' })
    const input = screen.getByTestId('profile-avatar-input')
    await user.upload(input, file)

    expect(uploadMutate).toHaveBeenCalledWith({ userId: 'user-1', file }, expect.anything())
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- ProfileAvatarUploader.test.tsx`
Expected: FAIL — `Cannot find module './ProfileAvatarUploader'`.

- [ ] **Step 3: Implementar o componente**

```tsx
import { useRef, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { LumaSpin } from '@/components/ui/luma-spin'
import { useUploadProfileAvatar } from '@/features/profiles/useUploadProfileAvatar'

interface ProfileAvatarUploaderProps {
  userId: string
  avatarUrl: string | null
}

export function ProfileAvatarUploader({ userId, avatarUrl }: ProfileAvatarUploaderProps) {
  const uploadAvatar = useUploadProfileAvatar()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    uploadAvatar.mutate(
      { userId, file },
      {
        onSuccess: () => toast.success('Foto atualizada.'),
        onError: () => toast.error('Não foi possível enviar a foto.'),
      },
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
        {uploadAvatar.isPending ? (
          <div className="flex size-full items-center justify-center">
            <LumaSpin className="w-8" />
          </div>
        ) : (
          avatarUrl && <img src={avatarUrl} alt="Sua foto de perfil" className="size-full object-cover" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Alterar foto"
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent outline-none transition hover:bg-black/40 hover:text-white focus-visible:bg-black/40 focus-visible:text-white focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Camera className="size-5" />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        data-testid="profile-avatar-input"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- ProfileAvatarUploader.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/routes/profile/components/ProfileAvatarUploader.tsx src/routes/profile/components/ProfileAvatarUploader.test.tsx
git commit -m "feat: adiciona componente ProfileAvatarUploader"
```

---

### Task 6: Componente `ProfileDetailsSection`

**Files:**
- Create: `src/routes/profile/components/ProfileDetailsSection.tsx`
- Test: `src/routes/profile/components/ProfileDetailsSection.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const updateMutate = vi.fn()
vi.mock('@/features/profiles/useUpdateProfile', () => ({
  useUpdateProfile: () => ({ mutate: updateMutate }),
}))

vi.mock('./ProfileAvatarUploader', () => ({
  ProfileAvatarUploader: ({ userId }: { userId: string }) => <div>Avatar de {userId}</div>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ProfileDetailsSection } from './ProfileDetailsSection'

const profile = {
  id: 'user-1',
  username: 'leandro',
  display_name: 'Leandro Carvalho',
  bio: 'Bio atual',
  avatar_url: null,
  role: 'user',
  created_at: '2026-01-01T00:00:00Z',
}

describe('ProfileDetailsSection', () => {
  it('preenche os campos com os valores atuais do perfil', () => {
    render(<ProfileDetailsSection profile={profile} />)

    expect(screen.getByLabelText('Nome')).toHaveValue('Leandro Carvalho')
    expect(screen.getByLabelText('Bio')).toHaveValue('Bio atual')
    expect(screen.getByText('Avatar de user-1')).toBeInTheDocument()
  })

  it('exibe erro quando o nome fica vazio', async () => {
    const user = userEvent.setup()
    render(<ProfileDetailsSection profile={profile} />)

    await user.clear(screen.getByLabelText('Nome'))
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Informe seu nome')).toBeInTheDocument()
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it('salva o nome e a bio ao submeter', async () => {
    const user = userEvent.setup()
    render(<ProfileDetailsSection profile={profile} />)

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Novo Nome')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(updateMutate).toHaveBeenCalledWith(
      { id: 'user-1', values: { display_name: 'Novo Nome', bio: 'Bio atual' } },
      expect.anything(),
    )
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- ProfileDetailsSection.test.tsx`
Expected: FAIL — `Cannot find module './ProfileDetailsSection'`.

- [ ] **Step 3: Implementar o componente**

```tsx
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- ProfileDetailsSection.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/routes/profile/components/ProfileDetailsSection.tsx src/routes/profile/components/ProfileDetailsSection.test.tsx
git commit -m "feat: adiciona componente ProfileDetailsSection"
```

---

### Task 7: Componente `PasswordSection`

**Files:**
- Create: `src/routes/profile/components/PasswordSection.tsx`
- Test: `src/routes/profile/components/PasswordSection.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const changePasswordMutate = vi.fn()
vi.mock('@/features/profiles/useChangePassword', () => ({
  useChangePassword: () => ({ mutate: changePasswordMutate }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { PasswordSection } from './PasswordSection'

describe('PasswordSection', () => {
  it('exibe erro quando a senha tem menos de 6 caracteres', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    await user.type(screen.getByLabelText('Nova senha'), '123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), '123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument()
    expect(changePasswordMutate).not.toHaveBeenCalled()
  })

  it('exibe erro quando as senhas nao coincidem', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    await user.type(screen.getByLabelText('Nova senha'), 'senha123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'outraSenha')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument()
    expect(changePasswordMutate).not.toHaveBeenCalled()
  })

  it('chama a mutation com a nova senha quando o formulario e valido', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    await user.type(screen.getByLabelText('Nova senha'), 'senha123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    expect(changePasswordMutate).toHaveBeenCalledWith('senha123', expect.anything())
  })

  it('alterna mostrar/ocultar a senha', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    const passwordInput = screen.getByLabelText('Nova senha')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /mostrar senha/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- PasswordSection.test.tsx`
Expected: FAIL — `Cannot find module './PasswordSection'`.

- [ ] **Step 3: Implementar o componente**

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useChangePassword } from '@/features/profiles/useChangePassword'

const passwordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export function PasswordSection() {
  const changePassword = useChangePassword()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })

  function onSubmit(values: PasswordFormValues) {
    changePassword.mutate(values.password, {
      onSuccess: () => {
        toast.success('Senha alterada.')
        reset()
      },
      onError: () => toast.error('Não foi possível alterar a senha.'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança</CardTitle>
        <CardDescription>Altere sua senha de acesso.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex max-w-sm flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-8"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-0.5 -translate-y-1/2"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- PasswordSection.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/routes/profile/components/PasswordSection.tsx src/routes/profile/components/PasswordSection.test.tsx
git commit -m "feat: adiciona componente PasswordSection"
```

---

### Task 8: Componente `AccountInfoSection`

**Files:**
- Create: `src/routes/profile/components/AccountInfoSection.tsx`
- Test: `src/routes/profile/components/AccountInfoSection.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountInfoSection } from './AccountInfoSection'

const baseProfile = {
  id: 'user-1',
  username: 'leandro',
  display_name: 'Leandro Carvalho',
  bio: null,
  avatar_url: null,
  created_at: '2026-01-15T12:00:00.000Z',
}

describe('AccountInfoSection', () => {
  it('exibe o email, o papel admin e a data de criacao', () => {
    render(
      <AccountInfoSection email="leandro@aponti.org.br" profile={{ ...baseProfile, role: 'admin' }} />,
    )

    expect(screen.getByText('leandro@aponti.org.br')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('15/01/2026')).toBeInTheDocument()
  })

  it('exibe o papel basico para usuarios nao-admin', () => {
    render(
      <AccountInfoSection email="leandro@aponti.org.br" profile={{ ...baseProfile, role: 'user' }} />,
    )

    expect(screen.getByText('Básico')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- AccountInfoSection.test.tsx`
Expected: FAIL — `Cannot find module './AccountInfoSection'`.

- [ ] **Step 3: Implementar o componente**

```tsx
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- AccountInfoSection.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/routes/profile/components/AccountInfoSection.tsx src/routes/profile/components/AccountInfoSection.test.tsx
git commit -m "feat: adiciona componente AccountInfoSection"
```

---

### Task 9: `ProfilePage` — compor as três seções

**Files:**
- Modify: `src/routes/profile/ProfilePage.tsx`
- Test: `src/routes/profile/ProfilePage.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'user-1', email: 'leandro@aponti.org.br' } } }),
}))

const useProfileMock = vi.fn()
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: (userId: string | undefined) => useProfileMock(userId),
}))

vi.mock('./components/ProfileDetailsSection', () => ({
  ProfileDetailsSection: () => <div>Secao Perfil</div>,
}))
vi.mock('./components/PasswordSection', () => ({
  PasswordSection: () => <div>Secao Senha</div>,
}))
vi.mock('./components/AccountInfoSection', () => ({
  AccountInfoSection: () => <div>Secao Conta</div>,
}))

import ProfilePage from './ProfilePage'

describe('ProfilePage', () => {
  it('exibe skeleton enquanto carrega', () => {
    useProfileMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = render(<ProfilePage />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('exibe mensagem de erro quando a busca falha', () => {
    useProfileMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<ProfilePage />)

    expect(screen.getByText('Não foi possível carregar seu perfil.')).toBeInTheDocument()
  })

  it('renderiza as tres secoes quando o perfil carrega', () => {
    useProfileMock.mockReturnValue({
      data: { id: 'user-1', username: 'leandro', role: 'user' },
      isLoading: false,
      isError: false,
    })
    render(<ProfilePage />)

    expect(screen.getByText('Secao Perfil')).toBeInTheDocument()
    expect(screen.getByText('Secao Senha')).toBeInTheDocument()
    expect(screen.getByText('Secao Conta')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- ProfilePage.test.tsx`
Expected: FAIL — o placeholder atual (`<h1>Perfil</h1>`) não renderiza skeleton, mensagem de erro nem as três seções mockadas.

- [ ] **Step 3: Implementar a página**

Substituir todo o conteúdo de `src/routes/profile/ProfilePage.tsx` por:

```tsx
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
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- ProfilePage.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/routes/profile/ProfilePage.tsx src/routes/profile/ProfilePage.test.tsx
git commit -m "feat: implementa a pagina de Perfil"
```

---

### Task 10: Suite completa + `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rodar toda a suíte de testes, lint e typecheck**

Run: `npm test`
Expected: PASS — todos os testes, incluindo os novos de `useUpdateProfile`, `useUploadProfileAvatar`, `useChangePassword`, `ProfileAvatarUploader`, `ProfileDetailsSection`, `PasswordSection`, `AccountInfoSection` e `ProfilePage`.

Run: `npm run lint`
Expected: sem erros novos (avisos pré-existentes em outros arquivos são aceitáveis).

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 2: Atualizar `CLAUDE.md` — seção "Project status"**

Adicionar um novo parágrafo logo antes de `## What is being built` (após o parágrafo do Footer de copyright):

```markdown
Página de Perfil (2026-07-28): done — `ProfilePage` deixou de ser placeholder. Três `Card`s (`ProfileDetailsSection`, `PasswordSection`, `AccountInfoSection`, em `src/routes/profile/components/`) deixam o usuário editar nome/bio/avatar (`display_name`/`bio`/`avatar_url`, colunas já existentes em `profiles`), trocar a própria senha (`supabase.auth.updateUser`, sem pedir a senha atual) e ver email/papel/data de criação somente leitura. Novos hooks `useUpdateProfile`/`useUploadProfileAvatar`/`useChangePassword` em `src/features/profiles/`. Novo bucket Storage `profile-avatars` (público, 5MB, mesmo padrão hardened de `page-avatars`). Ver `docs/superpowers/specs/2026-07-28-pagina-perfil-design.md`.
```

- [ ] **Step 3: Atualizar `CLAUDE.md` — seção "Screens / feature surface"**

Trocar a frase que hoje diz (no parágrafo introdutório da seção):

```markdown
`Login`, `Dashboard`, Page CRUD, the link-block editor, the public page view, Analytics, and Settings (admin section only, see below) now have real behavior; Profile still renders static placeholder text pending its build-order slot.
```

por:

```markdown
`Login`, `Dashboard`, Page CRUD, the link-block editor, the public page view, Analytics, Settings, and Profile now have real behavior.
```

- [ ] **Step 4: Atualizar `CLAUDE.md` — seção "Known gaps / next steps"**

No trecho:

```markdown
`Profile` (the screen, distinct from the `profiles` table) is still a placeholder — role management lives in Settings, not Profile.
```

trocar por:

```markdown
`Profile` (the screen, distinct from the `profiles` table) now lets a user edit their own display name/bio/avatar and change their password (2026-07-28) — role management still lives in Settings, not Profile.
```

- [ ] **Step 5: Atualizar `CLAUDE.md` — seção "Domain model" (Storage)**

Depois da frase sobre o bucket `page-avatars`, adicionar:

```markdown
Um segundo bucket, `profile-avatars` (público, adicionado 2026-07-28), guarda a foto de perfil de cada usuário em `{user_id}/avatar.{ext}` — mesmo padrão de policies do `page-avatars` (leitura pública, escrita só do dono, `_admin_all` pra admins), sem a checagem de "página publicada" (não se aplica a perfis).
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md com a pagina de Perfil"
```

---

## Plan Self-Review

**Spec coverage:** migração do bucket (Task 1), os 3 hooks (Tasks 2-4), os 4 componentes (Tasks 5-8), a página compondo tudo (Task 9), testes em cada task, documentação (Task 10). Todos os itens da spec de 2026-07-28 estão cobertos — nome/bio/avatar, trocar senha sem pedir a atual, info somente-leitura (email/papel/membro desde).

**Placeholder scan:** nenhum "TBD"/"handle edge cases" — todo código, testes e comandos estão completos e concretos.

**Type consistency:** `Tables<'profiles'>` e `TablesUpdate<'profiles'>` (de `src/lib/database.types.ts`) usados de forma consistente nas Tasks 2, 3, 6, 8 e 9. `userId`/`profile.id` usados com os mesmos nomes em todos os call sites (`ProfileAvatarUploader`, `useUploadProfileAvatar`, `useUpdateProfile`).
