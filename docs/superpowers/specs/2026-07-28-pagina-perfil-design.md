# Página de Perfil

Data: 2026-07-28

## Objetivo

Substituir o placeholder atual de `ProfilePage` (`src/routes/profile/ProfilePage.tsx`, hoje só um `<h1>Perfil</h1>`) por uma tela real onde o usuário logado pode:

1. Editar nome de exibição (`display_name`) e uma bio curta (`bio`).
2. Enviar/trocar sua foto de perfil (`avatar_url`).
3. Trocar a própria senha.
4. Ver, somente leitura: email, papel (Admin/Básico) e data de criação da conta.

Nenhum campo novo é necessário na tabela `profiles` — `display_name`, `bio` e `avatar_url` já existem desde o schema inicial e nunca tiveram UI. `username` não faz parte desta tela (decisão do usuário: manter o escopo em nome/avatar/bio/senha/somente-leitura).

## Escopo

Fora de escopo:
- Editar `username` (não pedido).
- Editar email (não existe fluxo de troca de email verificada neste projeto).
- Excluir a própria conta.
- Pedir a senha atual antes de trocar a senha (decisão do usuário: a sessão autenticada já autoriza `auth.updateUser`, mesmo nível de simplicidade do restante do projeto).

## Estrutura da tela

`src/routes/profile/ProfilePage.tsx` — três `Card`s em coluna, mesmo padrão de `SettingsPage` (`AppearanceSection`/`UsersSection`): cada `Card` é uma seção com um componente próprio e uma responsabilidade/mutation isolada.

```tsx
export default function ProfilePage() {
  const { session } = useSession()
  const { data: profile } = useProfile(session?.user.id)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Perfil</h1>
      <ProfileDetailsSection profile={profile} />
      <PasswordSection />
      <AccountInfoSection email={session?.user.email} profile={profile} />
    </div>
  )
}
```

(`ProfileDetailsSection`/`PasswordSection`/`AccountInfoSection` recebem `profile: Tables<'profiles'> | undefined` ou os campos primitivos necessários — a assinatura exata dos props fica pro plano de implementação decidir, análoga à divisão já existente de `AppearanceSection`/`UsersSection` em `SettingsPage.tsx`.)

### Card "Perfil" (`ProfileDetailsSection`)

- Avatar (componente novo `ProfileAvatarUploader`, adaptado de `AvatarUploader` — mesmo padrão visual: círculo com overlay de câmera no hover, `LumaSpin` enquanto envia).
- Formulário `react-hook-form` + Zod:
  - `display_name`: obrigatório, mínimo 1 caractere.
  - `bio`: opcional, `Textarea`, máximo 280 caracteres.
- Botão "Salvar" explícito (não autosave — é um formulário simples de poucos campos, diferente do editor de blocos de página). Estado de submit desabilita o botão e mostra "Salvando...".
- `toast.success`/`toast.error` ao salvar, mesma convenção do resto do app.

### Card "Segurança" (`PasswordSection`)

- Formulário `react-hook-form` + Zod, dois campos: "Nova senha" e "Confirmar nova senha".
  - `password`: mínimo 6 caracteres (mínimo padrão do Supabase Auth).
  - `confirmPassword`: `.refine` verificando igualdade com `password`, mensagem "As senhas não coincidem" no campo de confirmação.
- Ambos os campos com toggle mostrar/ocultar senha (`Eye`/`EyeOff`, mesmo padrão do `LoginPage`).
- Botão "Alterar senha". Ao submeter com sucesso, limpa os dois campos (`reset()`) e mostra `toast.success('Senha alterada.')`. Erro mostra `toast.error`.
- **Não** pede a senha atual (decisão já registrada acima).

### Card "Conta" (`AccountInfoSection`, somente leitura)

- Email (`session.user.email`).
- `Badge` de papel: "Admin" (`variant="default"`) ou "Básico" (`variant="secondary"`) — mesmo estilo usado em `UsersSection`.
- "Membro desde": `profile.created_at` formatado como data (`pt-BR`, ex. `new Date(profile.created_at).toLocaleDateString('pt-BR')`).

## Novos hooks (`src/features/profiles/`)

- **`useUpdateProfile.ts`** — mutation `{ id, values: { display_name, bio } }` → `{id}` no formato já usado por `useUpdatePage`/`useUpdateLink` (valores no momento da chamada, não vinculados ao hook). Faz `supabase.from('profiles').update(values).eq('id', id).select().single()`. `onSuccess`: invalida `['profile', id]` (e popula com o retorno, mesmo padrão de outros hooks de mutation no projeto).
- **`useUploadProfileAvatar.ts`** — espelha `useUploadPageAvatar.ts`: `mutationFn({ userId, file })` faz upload pro bucket `profile-avatars` no caminho `{userId}/avatar.{ext}` com `upsert: true`, lê a URL pública via `getPublicUrl`, grava em `profiles.avatar_url` via update, invalida `['profile', userId]`.
- **`useChangePassword.ts`** — mutation `(password: string) => supabase.auth.updateUser({ password })`. Sem invalidação de query (não mexe em nenhuma tabela).

## Migração nova (Supabase)

Novo arquivo `supabase/migrations/20260728000000_profile_avatars_storage.sql`, seguindo o mesmo padrão hardened de `page-avatars` (`20260721000000_page_avatar_and_storage.sql` + `20260721000001_page_avatars_hardening.sql`), mas **sem** a lógica de "só se a página estiver publicada" — `profiles` não tem esse conceito, então a leitura pública do bucket é simples:

```sql
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

Aplicada via a ferramenta MCP do Supabase (`apply_migration`), como todas as migrações anteriores deste projeto — não há setup local do Supabase CLI (gap já conhecido, ver `CLAUDE.md`).

Depois de aplicar, regenerar `src/lib/database.types.ts` (`generate_typescript_types`) — o bucket novo não deveria mudar tipos de tabela, mas é o passo padrão já seguido em toda mudança de schema deste projeto.

## Testes

- `useUpdateProfile`, `useUploadProfileAvatar`, `useChangePassword`: testes de hook mockando `supabase`, mesmo padrão dos hooks existentes em `src/features/pages/`/`src/features/profiles/`.
- `ProfileDetailsSection`, `PasswordSection`, `AccountInfoSection`, `ProfileAvatarUploader`: testes de componente (render, validação de formulário, chamada de mutation ao submeter) — mesmo padrão de `AvatarUploader`/`SettingsPage`.
- `ProfilePage`: teste de integração leve confirmando que as três seções renderizam.

## Fora de escopo / não-metas

- Reautenticação com senha atual antes de trocar a senha.
- Edição de `username` ou email.
- Exclusão de conta.
- Mostrar o avatar de perfil em outros lugares do app (Sidebar/Topbar) — fica pra uma iteração futura se for pedido; esta spec cobre só a tela de Perfil em si.
