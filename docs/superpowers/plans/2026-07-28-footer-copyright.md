# Footer de copyright e desenvolvedor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um rodapé de copyright ("Copyright (c) 2026 Aponti · Desenvolvido por Leandro Carvalho", com link para o LinkedIn do autor) tanto no app admin quanto na página pública.

**Architecture:** Um componente compartilhado `Footer` (`src/components/layout/Footer.tsx`) com prop `variant: 'admin' | 'public'` que só muda a cor do texto; usado dentro do `SidebarFooter` existente em `Sidebar.tsx` e como último elemento da coluna de conteúdo em `PublicPagePage.tsx`.

**Tech Stack:** React 19 + TypeScript, Tailwind v4 (`cn()` helper de `src/lib/utils.ts`), Vitest + Testing Library.

Spec de referência: `docs/superpowers/specs/2026-07-28-footer-copyright-design.md`

---

### Task 1: Componente `Footer` compartilhado

**Files:**
- Create: `src/components/layout/Footer.tsx`
- Test: `src/components/layout/Footer.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `src/components/layout/Footer.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'

describe('Footer', () => {
  it('exibe o texto de copyright', () => {
    render(<Footer variant="admin" />)
    expect(screen.getByText(/copyright \(c\) 2026 aponti/i)).toBeInTheDocument()
  })

  it('linka o nome do desenvolvedor para o linkedin, abrindo em nova aba', () => {
    render(<Footer variant="admin" />)
    const link = screen.getByRole('link', { name: /leandro carvalho/i })
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/leandro-c-s/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('usa a cor de texto da variant admin', () => {
    render(<Footer variant="admin" />)
    expect(screen.getByText(/copyright/i)).toHaveClass('text-sidebar-foreground/70')
  })

  it('usa a cor de texto da variant public', () => {
    render(<Footer variant="public" />)
    expect(screen.getByText(/copyright/i)).toHaveClass('text-white/70')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- Footer.test.tsx`
Expected: FAIL — `Cannot find module './Footer'` (o arquivo `Footer.tsx` ainda não existe).

- [ ] **Step 3: Implementar o componente**

Criar `src/components/layout/Footer.tsx`:

```tsx
import { cn } from '@/lib/utils'

type FooterProps = {
  variant: 'admin' | 'public'
}

const VARIANT_TEXT_CLASSES: Record<FooterProps['variant'], string> = {
  admin: 'text-sidebar-foreground/70',
  public: 'text-white/70',
}

export function Footer({ variant }: FooterProps) {
  return (
    <p className={cn('px-2 py-1.5 text-xs', VARIANT_TEXT_CLASSES[variant])}>
      Copyright (c) 2026 Aponti · Desenvolvido por{' '}
      <a
        href="https://www.linkedin.com/in/leandro-c-s/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        Leandro Carvalho
      </a>
    </p>
  )
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Footer.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Footer.tsx src/components/layout/Footer.test.tsx
git commit -m "feat: adiciona componente Footer de copyright"
```

---

### Task 2: Usar o `Footer` no app admin (`Sidebar`)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Sidebar.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando) em `Sidebar.test.tsx`**

Adicionar este `it` dentro do `describe('Sidebar', ...)` existente em `src/components/layout/Sidebar.test.tsx` (depois do teste `'permite sair pelo botao no rodape do menu lateral'`):

```tsx
  it('exibe o footer de copyright no rodape do menu lateral', () => {
    render(
      <MemoryRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/copyright \(c\) 2026 aponti/i)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- Sidebar.test.tsx`
Expected: FAIL no novo teste — texto "Copyright (c) 2026 Aponti" não encontrado.

- [ ] **Step 3: Usar o `Footer` em `Sidebar.tsx`**

Em `src/components/layout/Sidebar.tsx`, adicionar o import (junto aos outros imports locais):

```tsx
import { Footer } from './Footer'
```

E alterar o `SidebarFooter` (linhas 55-67 atualmente) de:

```tsx
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
```

para:

```tsx
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Footer variant="admin" />
      </SidebarFooter>
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- Sidebar.test.tsx`
Expected: PASS (4 testes, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Sidebar.test.tsx
git commit -m "feat: exibe o Footer de copyright na Sidebar do admin"
```

---

### Task 3: Usar o `Footer` na página pública (`PublicPagePage`)

**Files:**
- Modify: `src/routes/public/PublicPagePage.tsx`
- Modify: `src/routes/public/PublicPagePage.test.tsx`

- [ ] **Step 1: Escrever o teste (falhando) em `PublicPagePage.test.tsx`**

Adicionar este `it` dentro do `describe('PublicPagePage', ...)` existente em `src/routes/public/PublicPagePage.test.tsx` (depois do teste `'preserva quebras de linha na descricao'`):

```tsx
  it('exibe o footer de copyright na pagina publica', () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    renderPublicPage()

    expect(screen.getByText(/copyright \(c\) 2026 aponti/i)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- PublicPagePage.test.tsx`
Expected: FAIL no novo teste — texto "Copyright (c) 2026 Aponti" não encontrado.

- [ ] **Step 3: Usar o `Footer` em `PublicPagePage.tsx`**

Em `src/routes/public/PublicPagePage.tsx`, adicionar o import (junto aos outros imports de componentes):

```tsx
import { Footer } from '@/components/layout/Footer'
```

E alterar o final da `div` de conteúdo (linhas 96-111 atualmente) de:

```tsx
        <div className="flex w-full flex-col gap-3">
          {sections.map((section) =>
            section.type === 'plain' ? (
              <PublicLinkBlock key={section.link.id} link={section.link} onInteract={handleLinkInteract} />
            ) : (
              <PublicCollapsibleSection
                key={section.title.id}
                section={section}
                onInteract={handleLinkInteract}
              />
            ),
          )}
        </div>

        {icons.length > 0 && <PublicSocialIcons icons={icons} onInteract={handleLinkInteract} />}
      </div>
    </div>
  )
}
```

para:

```tsx
        <div className="flex w-full flex-col gap-3">
          {sections.map((section) =>
            section.type === 'plain' ? (
              <PublicLinkBlock key={section.link.id} link={section.link} onInteract={handleLinkInteract} />
            ) : (
              <PublicCollapsibleSection
                key={section.title.id}
                section={section}
                onInteract={handleLinkInteract}
              />
            ),
          )}
        </div>

        {icons.length > 0 && <PublicSocialIcons icons={icons} onInteract={handleLinkInteract} />}

        <Footer variant="public" />
      </div>
    </div>
  )
}
```

(O footer não aparece nos estados de loading/erro — só no `return` de sucesso, que é este bloco.)

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- PublicPagePage.test.tsx`
Expected: PASS (todos os testes, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add src/routes/public/PublicPagePage.tsx src/routes/public/PublicPagePage.test.tsx
git commit -m "feat: exibe o Footer de copyright na pagina publica"
```

---

### Task 4: Rodar a suíte completa e atualizar o CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rodar toda a suíte de testes, lint e typecheck**

Run: `npm test`
Expected: PASS — todos os testes, incluindo os novos de `Footer`, `Sidebar` e `PublicPagePage`.

Run: `npm run lint`
Expected: sem erros novos.

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 2: Atualizar `CLAUDE.md` — seção "Project status"**

No arquivo `CLAUDE.md`, logo antes da linha `## What is being built`, adicionar um novo parágrafo (mantendo a linha em branco entre parágrafos, seguindo o padrão dos parágrafos anteriores da seção):

```markdown
Footer de copyright (2026-07-28): done — um componente compartilhado `Footer` (`src/components/layout/Footer.tsx`, prop `variant: 'admin' | 'public'`) mostra "Copyright (c) 2026 Aponti · Desenvolvido por Leandro Carvalho" (link para `https://www.linkedin.com/in/leandro-c-s/`, nova aba) tanto no rodapé da `Sidebar` do admin quanto no fim da página pública (`/:slug`) — texto fixo, sem dado no banco. Ver `docs/superpowers/specs/2026-07-28-footer-copyright-design.md`.
```

- [ ] **Step 3: Atualizar `CLAUDE.md` — seção "Architecture"**

Na seção `## Architecture`, no bullet que começa com `` `src/components/layout/` `` (o que descreve `AppLayout`, `Sidebar`, `Topbar`, `Breadcrumb`), adicionar ao final do bullet (antes do ponto final da frase sobre o `SidebarFooter`) a menção ao novo `Footer`:

Trocar:

```markdown
...unlike the nav items above), renders via `render={<NavLink to={to} />}`, the same Base UI polymorphic pattern used elsewhere — the rendered element stays a real `<a>`, so tests still query `getByRole('link', ...)`. A `SidebarFooter` (added 2026-07-20) holds the "Sair" `SidebarMenuButton` — no `render` prop needed there since it stays a plain `<button>` calling `supabase.auth.signOut()`, unlike the nav items above), `Topbar` (renders `SidebarTrigger`...
```

por:

```markdown
...unlike the nav items above), renders via `render={<NavLink to={to} />}`, the same Base UI polymorphic pattern used elsewhere — the rendered element stays a real `<a>`, so tests still query `getByRole('link', ...)`. A `SidebarFooter` (added 2026-07-20) holds the "Sair" `SidebarMenuButton` — no `render` prop needed there since it stays a plain `<button>` calling `supabase.auth.signOut()`, unlike the nav items above) plus, since 2026-07-28, a shared `Footer` (`src/components/layout/Footer.tsx`, `variant: 'admin' | 'public'`) reused verbatim on `PublicPagePage`), `Topbar` (renders `SidebarTrigger`...
```

(Ajustar apenas essa frase — o restante do bullet permanece igual.)

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md com o footer de copyright"
```

---

## Plan Self-Review

**Spec coverage:** componente `Footer` com `variant` (Task 1), uso na Sidebar admin (Task 2), uso na página pública sem aparecer em loading/erro (Task 3), testes para os 3 pontos, decisão explícita documentada. Todos os itens da spec de 2026-07-28 estão cobertos.

**Placeholder scan:** nenhum "TBD"/"handle edge cases" — todo código e comandos estão completos.

**Type consistency:** `FooterProps['variant']` = `'admin' | 'public'` usado de forma consistente nas Tasks 1, 2 e 3.
