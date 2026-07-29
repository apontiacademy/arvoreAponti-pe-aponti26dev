# Avatar e nome de perfil no Topbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o email cru exibido no `Topbar` por um link para `/profile` mostrando o avatar (ou iniciais) e o nome de exibição do usuário logado.

**Architecture:** `Topbar.tsx` passa a chamar `useProfile` (hook já existente) além do `useSession` que já usa, e renderiza o resultado com o componente shadcn `Avatar` (Base UI, já adicionado em `src/components/ui/avatar.tsx` num commit anterior desta mesma branch) dentro de um `Button variant="ghost"` renderizado como `Link`. Uma função local `getInitials` deriva o fallback a partir do nome.

**Tech Stack:** React 19 + TypeScript, TanStack Query v5 (via `useProfile`), React Router v7 (`Link`), shadcn/ui `Avatar`/`Button`/`Skeleton` (Base UI), Vitest + Testing Library.

Spec de referência: `docs/superpowers/specs/2026-07-29-avatar-topbar-design.md`

**Nota importante sobre testes:** o `AvatarImage` deste projeto (Base UI, `@base-ui/react/avatar`) só renderiza a tag `<img>` real depois que uma instância `new window.Image()` interna dispara `onload` (status `'loaded'`) — ver `node_modules/@base-ui/react/avatar/image/useImageLoadingStatus.mjs`. o jsdom (ambiente de teste deste projeto, `vitest` com `environment: 'jsdom'`) **não** dispara esse evento para nenhuma URL, real ou fake — então em teste o `imageLoadingStatus` fica parado em `'loading'` para sempre, o `<img>` nunca monta, e o `AvatarFallback` (iniciais) sempre aparece, mesmo quando `avatar_url` está preenchido. Por isso os testes abaixo **não** tentam verificar `getByRole('img')`/`src` do avatar carregado — isso só é verificável manualmente num navegador real (dev server). Os testes cobrem o que é genuinamente determinístico em jsdom: o texto do nome, o fallback de iniciais, o link, e o skeleton de carregamento.

---

### Task 1: Atualizar o `Topbar` para mostrar avatar + nome

**Files:**
- Modify: `src/components/layout/Topbar.tsx`
- Modify: `src/components/layout/Topbar.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

Substituir todo o conteúdo de `src/components/layout/Topbar.test.tsx` por:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'

vi.mock('@/features/auth/useSession', () => ({
  useSession: () => ({
    session: { user: { id: 'user-1', email: 'user@aponti.com' } },
    isLoading: false,
    error: null,
  }),
}))

const useProfileMock = vi.fn()
vi.mock('@/features/profiles/useProfile', () => ({
  useProfile: (userId: string | undefined) => useProfileMock(userId),
}))

import { Topbar } from './Topbar'

function renderTopbar() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <Topbar />
      </SidebarProvider>
    </MemoryRouter>,
  )
}

describe('Topbar', () => {
  it('exibe o nome de exibicao e as iniciais como avatar', () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        username: 'leandro',
        display_name: 'Leandro Carvalho',
        avatar_url: null,
      },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.getByText('Leandro Carvalho')).toBeInTheDocument()
    expect(screen.getByText('LC')).toBeInTheDocument()
  })

  it('usa o username quando display_name e nulo', () => {
    useProfileMock.mockReturnValue({
      data: { id: 'user-1', username: 'leandro', display_name: null, avatar_url: null },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.getByText('leandro')).toBeInTheDocument()
  })

  it('o link aponta para /profile', () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        username: 'leandro',
        display_name: 'Leandro Carvalho',
        avatar_url: null,
      },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.getByRole('button', { name: /leandro carvalho/i })).toHaveAttribute(
      'href',
      '/profile',
    )
  })

  it('exibe skeleton enquanto o perfil carrega', () => {
    useProfileMock.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = renderTopbar()

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('nao exibe mais o email cru', () => {
    useProfileMock.mockReturnValue({
      data: {
        id: 'user-1',
        username: 'leandro',
        display_name: 'Leandro Carvalho',
        avatar_url: null,
      },
      isLoading: false,
    })
    renderTopbar()

    expect(screen.queryByText('user@aponti.com')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- Topbar.test.tsx`
Expected: FAIL — o `Topbar` atual não chama `useProfile` (o mock nunca é lido) e ainda renderiza `session.user.email` em vez do nome/avatar; os testes que buscam "Leandro Carvalho"/"LC"/o link `/profile` não encontram nada.

- [ ] **Step 3: Implementar a mudança no `Topbar`**

Substituir todo o conteúdo de `src/components/layout/Topbar.tsx` por:

```tsx
import { Link } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/useSession'
import { useProfile } from '@/features/profiles/useProfile'

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function Topbar() {
  const { session } = useSession()
  const { data: profile, isLoading } = useProfile(session?.user.id)
  const label = profile ? profile.display_name || profile.username : ''

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-end gap-4">
        {isLoading || !profile ? (
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <Button
            variant="ghost"
            className="h-auto gap-2 px-2 py-1"
            render={<Link to="/profile" />}
            nativeButton={false}
          >
            <Avatar size="sm">
              <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{getInitials(label)}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{label}</span>
          </Button>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Topbar.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Topbar.tsx src/components/layout/Topbar.test.tsx
git commit -m "feat: exibe avatar e nome de perfil no Topbar"
```

---

### Task 2: Suite completa + `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rodar toda a suíte de testes, lint e typecheck**

Run: `npm test`
Expected: PASS — todos os testes, incluindo os novos/atualizados de `Topbar.test.tsx`.

Run: `npm run lint`
Expected: sem erros novos (avisos pré-existentes em outros arquivos são aceitáveis).

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 2: Atualizar `CLAUDE.md` — seção "Project status"**

Adicionar um novo parágrafo logo antes de `## What is being built` (após o parágrafo "Página de Perfil (2026-07-28)"):

```markdown
Avatar no Topbar (2026-07-29): done — o `Topbar` do admin trocou o email cru do usuário logado por um link para `/profile` mostrando o `Avatar` (shadcn/Base UI, `src/components/ui/avatar.tsx`) e o `display_name` (ou `username` se `display_name` for nulo) do perfil, lido via `useProfile` (mesmo hook já usado por `ProfilePage`/`SettingsPage`). Sem `avatar_url`, mostra iniciais como fallback (`AvatarFallback`). Escopo deliberadamente restrito ao `Topbar` — a `Sidebar` não muda nesta iteração. Ver `docs/superpowers/specs/2026-07-29-avatar-topbar-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md com o avatar no Topbar"
```

---

## Plan Self-Review

**Spec coverage:** avatar/nome no Topbar substituindo o email (Task 1, Step 3), fallback de iniciais sem `avatar_url` (Task 1, `getInitials` + teste "iniciais"), username como fallback de `display_name` (teste dedicado), skeleton de carregamento (teste dedicado), link para `/profile` (teste dedicado), documentação (Task 2). Todos os itens da spec de 2026-07-29 estão cobertos.

**Placeholder scan:** nenhum "TBD"/"handle edge cases" — todo código, testes e comandos estão completos e concretos.

**Type consistency:** `getInitials(name: string): string` usado de forma consistente entre a implementação e a explicação da spec. `profile.display_name`/`profile.username`/`profile.avatar_url` batem com os campos de `Tables<'profiles'>` já usados em `ProfileDetailsSection`/`AccountInfoSection`. `useProfile(userId: string | undefined)` chamado com a mesma assinatura já usada em `ProfilePage`/`SettingsPage`.
