# Avatar e nome de perfil no Topbar

Data: 2026-07-29

## Objetivo

Depois que a Página de Perfil (2026-07-28) passou a permitir editar foto, nome de exibição e bio, esses dados não apareciam em nenhum outro lugar do app — só na própria tela de Perfil. Esta mudança mostra a foto e o nome do usuário logado no `Topbar`, no lugar do email cru que é exibido hoje.

## Escopo

- Só o `Topbar` (`src/components/layout/Topbar.tsx`). `Sidebar` não muda nesta iteração (decisão do usuário).
- Sem novas colunas/migrações — consome `profiles.display_name`/`profiles.avatar_url`/`profiles.username`, todas já existentes e já usadas pela Página de Perfil.

## Comportamento

`Topbar` passa a chamar `useProfile(session?.user.id)` (hook já existente, `src/features/profiles/useProfile.ts`) além do `useSession()` que já usa.

O texto de email é substituído por um link para `/profile`, contendo avatar + nome:

- **Nome exibido:** `profile.display_name` se preenchido; senão `profile.username`.
- **Avatar:** `profile.avatar_url` se existir (via `AvatarImage`); senão, iniciais do nome exibido (via `AvatarFallback`) — ex. "Leandro Carvalho" → "LC", "leandro" (sem espaço) → "L". Função local `getInitials(name: string): string` (primeira letra das duas primeiras palavras, maiúsculas; uma palavra só = primeira letra) — não vira um módulo compartilhado por ora, é usada num único call site.
- **Estado de carregamento** (`useProfile` ainda sem dado): mostra um `Skeleton` circular (`size-8`, mesmo tamanho do `Avatar size="sm"`) ao lado de um `Skeleton` retangular curto no lugar do texto, evitando um estado vazio/piscando.
- **Clique:** navega para `/profile`. Implementado como `Button variant="ghost"` renderizado como `Link` (`render={<Link to="/profile" />}`, `nativeButton={false}`) — mesmo padrão polimórfico Base UI já usado no resto do app (ex. `Dashboard`, `Sidebar`).

## Componentes novos

- `src/components/ui/avatar.tsx` — adicionado via `npx shadcn add avatar` (já executado), Base UI (`@base-ui/react/avatar`), estilo `base-nova`. Exporta `Avatar`/`AvatarImage`/`AvatarFallback` (e outros não usados aqui: `AvatarBadge`/`AvatarGroup`/`AvatarGroupCount`).

Nenhum outro componente novo — a lógica de `getInitials` e a composição do link ficam dentro do próprio `Topbar.tsx`, sem extrair um componente separado (é usado num único lugar; extrair agora seria abstração prematura).

## Testes

Atualiza `src/components/layout/Topbar.test.tsx` (hoje só verifica que o email aparece — esse assert será removido, já que o email deixa de ser mostrado):

- Mocka `@/features/profiles/useProfile` (padrão já usado em outros testes de tela, ex. `ProfilePage.test.tsx`).
- Envolve o render em `MemoryRouter` (necessário agora por causa do `Link` — mesmo padrão de `Sidebar.test.tsx`).
- Casos:
  1. Exibe o `display_name` e a imagem do avatar quando `avatar_url` está preenchido.
  2. Exibe as iniciais como fallback quando `avatar_url` é `null`.
  3. Usa `username` como texto quando `display_name` é `null`.
  4. O link/botão aponta para `/profile`.
  5. Mostra skeleton enquanto `useProfile` está carregando (`isLoading: true`, `data: undefined`).

## Fora de escopo / não-metas

- Mostrar avatar/nome na `Sidebar` (decisão do usuário: só Topbar por agora).
- Qualquer menu dropdown no clique (ex. "Sair", "Configurações") — o clique só navega para `/profile`, sem menu.
- Cache/otimização adicional: `useProfile` já usa a mesma `queryKey` (`['profile', userId]`) em todo o app, então o dado já costuma estar em cache quando o `Topbar` monta (ex. depois de visitar `/profile` ou `/settings`).
