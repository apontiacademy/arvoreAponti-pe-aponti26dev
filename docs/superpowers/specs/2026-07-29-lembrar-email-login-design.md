# Lembrar email no Login

Data: 2026-07-29

## Objetivo

A tela de Login já usa `autoComplete="email"`/`autoComplete="current-password"`, então o gerenciador de senhas nativo do navegador consegue oferecer autofill — mas usuários que usam um gerenciador de senhas externo (1Password, Bitwarden, etc.) não têm o email pré-preenchido por essa via. Esta mudança adiciona uma opção explícita "Lembrar meu email" que persiste **só o email** (nunca a senha) em `localStorage`, independente do que o navegador faz.

## Escopo

- Só `LoginPage.tsx` e um novo hook `useRememberedEmail`.
- Não mexe em `autoComplete`, no fluxo de autenticação (`supabase.auth.signInWithPassword`) nem em sessão/duração de login — é puramente sobre pré-preencher o campo de email.
- Sem novas colunas/tabelas — armazenamento é 100% client-side (`localStorage`), não Supabase.

## Comportamento

Novo hook `src/features/auth/useRememberedEmail.ts`:

- Chave de storage: `apontilinkcenter:remembered-email` (mesmo estilo de nome do `storageKey` já usado pelo `next-themes` em `providers.tsx`).
- API: `{ rememberedEmail: string | null, remember(email: string): void, forget(): void }`.
- `rememberedEmail` é lido do `localStorage` uma vez, de forma síncrona, no `useState` inicial (lazy initializer) — assim já está disponível no primeiro render, sem flash de campo vazio.
- `remember(email)` grava; `forget()` remove a chave. Ambos também atualizam o estado local `rememberedEmail`.

Mudanças em `LoginPage.tsx`:

- `loginSchema` ganha `rememberEmail: z.boolean()`.
- `useForm` recebe `defaultValues` calculados a partir de `useRememberedEmail()`:
  - `email: rememberedEmail ?? ''`
  - `rememberEmail: rememberedEmail !== null`
- Novo `Checkbox` (shadcn, a instalar via `npx shadcn add checkbox`) + `Label` "Lembrar meu email", posicionado entre o campo de senha e o botão "Entrar". Registrado via `register('rememberEmail')` como os outros campos — `react-hook-form` lida com `type="checkbox"` nativamente através do spread de `register`.
- Em `onSubmit`, **somente após** `signInWithPassword` retornar sem erro (mesmo ponto onde hoje já se chama `navigate('/dashboard', ...)`):
  - se `values.rememberEmail` for `true` → `remember(values.email)`
  - se for `false` → `forget()`
- Uma tentativa de login que falha (credenciais inválidas) não grava nem apaga o que já estava salvo — o `remember`/`forget` só roda no branch de sucesso.

## Componentes novos

- `src/components/ui/checkbox.tsx` — adicionado via `npx shadcn add checkbox` (Base UI, estilo `base-nova`, mesmo fluxo já usado para `sidebar`/`breadcrumb`/`collapsible`/`avatar`).

Nenhum outro componente novo. `useRememberedEmail` fica em `src/features/auth/`, ao lado de `useSession.ts`, seguindo o padrão de módulos por domínio já estabelecido no projeto.

## Testes

Novo `src/features/auth/useRememberedEmail.test.ts`:

1. Retorna `rememberedEmail: null` quando não há nada salvo.
2. `remember(email)` grava no `localStorage` e atualiza `rememberedEmail`.
3. `forget()` remove a chave e volta `rememberedEmail` para `null`.
4. Lê um valor pré-existente do `localStorage` no mount inicial (mock de `localStorage` populado antes do `renderHook`).

Atualiza `src/routes/login/LoginPage.test.tsx`:

1. Pré-preenche o campo de email e marca o checkbox quando `useRememberedEmail` mock retorna um email salvo.
2. Após login bem-sucedido com o checkbox marcado, chama `remember` com o email digitado.
3. Após login bem-sucedido com o checkbox desmarcado, chama `forget`.
4. Login com credenciais inválidas não chama `remember` nem `forget`.

(`useRememberedEmail` será mockado nos testes de `LoginPage`, mesmo padrão já usado para mockar hooks de outros domínios nos testes de tela.)

## Fora de escopo / não-metas

- Senha nunca é persistida por essa feature — continua exclusivamente a cargo do navegador/gerenciador de senhas do usuário.
- Não estende nem cria sessão "lembrada" — não afeta `supabase.auth` nem duração de login.
- Não substitui nem remove os atributos `autoComplete` já existentes — as duas abordagens convivem.
