# Redesign da página pública (avatar, seção colapsável, ícones sociais) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a página pública (`/:slug`) com avatar, links gerais, seções colapsáveis e uma fileira de ícones sociais no rodapé, num visual fixo em degradê roxo→amarelo — conforme `docs/superpowers/specs/2026-07-21-redesign-pagina-publica-design.md`.

**Architecture:** Uma coluna nova (`pages.avatar_url`) + bucket novo no Supabase Storage para o avatar (upload real, com policy por dono). Uma função pura (`groupPublicLinks`) particiona os links ativos de uma página em ícones sociais (extraídos para o rodapé) e seções (blocos simples ou seções colapsáveis, marcadas via `links.payload.collapsible` num bloco tipo "Título" — reaproveitando a coluna jsonb que já existe e está livre, sem migration nova pra isso). O editor ganha um `Switch` "Colapsável" nos blocos de título e um uploader de avatar; a página pública ganha um visual fixo (fundo em degradê, botões brancos) que não depende mais do tema claro/escuro do visitante — o que torna o `ThemeToggle` ali morto, e ele é removido.

**Tech Stack:** Supabase Storage (bucket + RLS), `@base-ui/react` Collapsible (via shadcn CLI), `@icons-pack/react-simple-icons` (ícones de marca reais), TanStack Query, Vitest + Testing Library.

---

### Task 1: Migration — `pages.avatar_url` + bucket de Storage + regenerar tipos

**Files:**
- Create: `supabase/migrations/20260721000000_page_avatar_and_storage.sql`
- Modify: `src/lib/database.types.ts` (regenerado, não editado à mão)

- [ ] **Step 1: Escrever a migration**

```sql
-- Coluna do avatar de cada árvore (independente do profile do dono, já que
-- um usuário pode ter várias árvores/personas diferentes).
alter table pages add column avatar_url text;

-- Bucket público (a foto precisa ser lida por qualquer visitante da página
-- pública) para o upload do avatar de cada árvore.
insert into storage.buckets (id, name, public)
values ('page-avatars', 'page-avatars', true)
on conflict (id) do nothing;

-- Leitura pública (mesma lógica de "página publicada é pública" já aplicada
-- em pages/links: aqui simplificamos para "todo o bucket é de leitura
-- pública", já que só guardamos avatares, sem dado sensível).
create policy "page_avatars_public_read"
on storage.objects for select
using (bucket_id = 'page-avatars');

-- Upload/edição/remoção só por quem é dono do arquivo: o caminho é sempre
-- "{auth.uid()}/{page_id}.{ext}", então a primeira pasta do caminho precisa
-- bater com quem está autenticado.
create policy "page_avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'page-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "page_avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'page-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "page_avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'page-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
```

- [ ] **Step 2: Aplicar via Supabase MCP**

Use a ferramenta MCP `apply_migration` (nome do projeto: `arvore-aponti`) com o nome `page_avatar_and_storage` e o SQL acima.

- [ ] **Step 3: Verificar com `get_advisors`**

Rode `get_advisors` (tipo `security`) e confirme que não há nenhum aviso novo além do já esperado (o mesmo padrão de bucket público já é usado por outras aplicações Supabase — leitura pública é intencional aqui).

- [ ] **Step 4: Regenerar os tipos TypeScript**

Use a ferramenta MCP `generate_typescript_types` e sobrescreva `src/lib/database.types.ts` com o resultado. Confirme que `Database['public']['Tables']['pages']['Row']` agora inclui `avatar_url: string | null`.

- [ ] **Step 5: Rodar typecheck**

```bash
npm run typecheck
```
Esperado: sem erros (o restante do código ainda não usa `avatar_url`, então não deve ter nada quebrando ainda).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260721000000_page_avatar_and_storage.sql src/lib/database.types.ts
git commit -m "feat: adiciona avatar_url em pages e bucket de storage para avatares"
```

---

### Task 2: `useDuplicatePage` também copia o avatar

**Files:**
- Modify: `src/features/pages/useDuplicatePage.ts`
- Modify: `src/features/pages/useDuplicatePage.test.tsx`

- [ ] **Step 1: Adicionar `avatar_url` ao insert da página duplicada**

Em `src/features/pages/useDuplicatePage.ts`, no `.insert({...})` dentro do `while (true)`, adicione o campo `avatar_url: page.avatar_url` junto aos demais campos já copiados (`title`, `slug`, `description`, `theme_id`, `settings`):

```ts
        const { data, error } = await supabase
          .from('pages')
          .insert({
            owner_id: page.owner_id,
            title: `${page.title} (cópia)`,
            slug,
            description: page.description,
            theme_id: page.theme_id,
            settings: page.settings,
            avatar_url: page.avatar_url,
            is_published: false,
          })
          .select()
          .single()
```

- [ ] **Step 2: Escrever o teste**

Em `src/features/pages/useDuplicatePage.test.tsx`, adicione ao objeto `originalPage` o campo `avatar_url: 'https://exemplo.com/avatar.png'`, e adicione um novo teste:

```ts
  it('copia o avatar_url da pagina original', async () => {
    const { pagesInsert } = setupSupabase({
      pageInsertResults: [{ data: { id: 'page-2' }, error: null }],
    })

    const { result } = renderHook(() => useDuplicatePage(), { wrapper: createWrapper() })
    result.current.mutate(originalPage)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(pagesInsert).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: 'https://exemplo.com/avatar.png' }),
    )
  })
```

- [ ] **Step 3: Rodar os testes**

```bash
npx vitest run src/features/pages/useDuplicatePage.test.tsx
```
Esperado: todos passam (os testes existentes usam `objectContaining`, então continuam válidos mesmo com o campo novo no insert).

- [ ] **Step 4: Commit**

```bash
git add src/features/pages/useDuplicatePage.ts src/features/pages/useDuplicatePage.test.tsx
git commit -m "feat: useDuplicatePage tambem copia o avatar_url da arvore original"
```

---

### Task 3: `linkPayload.ts` — helpers de seção colapsável

**Files:**
- Create: `src/features/links/linkPayload.ts`
- Create: `src/features/links/linkPayload.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { isCollapsibleTitle, withCollapsible } from './linkPayload'
import type { Link } from './useLinks'

function makeTitle(payload: unknown): Link {
  return { type: 'title', payload } as unknown as Link
}

describe('isCollapsibleTitle', () => {
  it('retorna false para tipos que nao sao titulo', () => {
    expect(isCollapsibleTitle({ type: 'link', payload: { collapsible: true } } as unknown as Link)).toBe(
      false,
    )
  })

  it('retorna false quando o payload nao marca collapsible', () => {
    expect(isCollapsibleTitle(makeTitle({}))).toBe(false)
    expect(isCollapsibleTitle(makeTitle({ collapsible: false }))).toBe(false)
  })

  it('retorna false para payload nulo, array ou nao-objeto', () => {
    expect(isCollapsibleTitle(makeTitle(null))).toBe(false)
    expect(isCollapsibleTitle(makeTitle([]))).toBe(false)
    expect(isCollapsibleTitle(makeTitle('texto'))).toBe(false)
  })

  it('retorna true quando o payload marca collapsible como true', () => {
    expect(isCollapsibleTitle(makeTitle({ collapsible: true }))).toBe(true)
  })
})

describe('withCollapsible', () => {
  it('adiciona collapsible a um payload vazio', () => {
    expect(withCollapsible({}, true)).toEqual({ collapsible: true })
  })

  it('preserva outras chaves do payload existente', () => {
    expect(withCollapsible({ outraChave: 'valor' }, true)).toEqual({
      outraChave: 'valor',
      collapsible: true,
    })
  })

  it('trata payload nulo ou invalido como objeto vazio', () => {
    expect(withCollapsible(null, false)).toEqual({ collapsible: false })
    expect(withCollapsible([], true)).toEqual({ collapsible: true })
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run src/features/links/linkPayload.test.ts
```
Esperado: FAIL (`Cannot find module './linkPayload'`).

- [ ] **Step 3: Implementar**

```ts
import type { Json } from '@/lib/database.types'
import type { Link } from './useLinks'

export function isCollapsibleTitle(link: Pick<Link, 'type' | 'payload'>): boolean {
  if (link.type !== 'title') return false
  const payload = link.payload
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false
  return (payload as Record<string, Json>).collapsible === true
}

export function withCollapsible(payload: Json, collapsible: boolean): Json {
  const base =
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, Json>)
      : {}
  return { ...base, collapsible }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run src/features/links/linkPayload.test.ts
```
Esperado: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/links/linkPayload.ts src/features/links/linkPayload.test.ts
git commit -m "feat: adiciona helpers isCollapsibleTitle/withCollapsible para links.payload"
```

---

### Task 4: `groupPublicLinks` — agrupamento da página pública

**Files:**
- Create: `src/features/public/groupPublicLinks.ts`
- Create: `src/features/public/groupPublicLinks.test.ts`

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, it, expect } from 'vitest'
import { groupPublicLinks } from './groupPublicLinks'
import type { Link } from '@/features/links/useLinks'

function link(overrides: Partial<Link>): Link {
  return {
    id: 'id',
    page_id: 'page-1',
    order: 0,
    label: null,
    url: null,
    payload: {},
    is_active: true,
    type: 'link',
    ...overrides,
  } as Link
}

describe('groupPublicLinks', () => {
  it('sem nenhum titulo colapsavel, tudo vira secoes simples na ordem original', () => {
    const links = [link({ id: '1', type: 'title', label: 'Ola' }), link({ id: '2' })]
    const { icons, sections } = groupPublicLinks(links)

    expect(icons).toEqual([])
    expect(sections).toEqual([
      { type: 'plain', link: links[0] },
      { type: 'plain', link: links[1] },
    ])
  })

  it('agrupa os links depois de um titulo colapsavel numa secao', () => {
    const title = link({ id: 'title-1', type: 'title', label: 'Mais', payload: { collapsible: true } })
    const child1 = link({ id: 'child-1' })
    const child2 = link({ id: 'child-2' })
    const { sections } = groupPublicLinks([title, child1, child2])

    expect(sections).toEqual([{ type: 'collapsible', title, children: [child1, child2] }])
  })

  it('fecha a secao colapsavel no proximo titulo, mesmo que nao seja colapsavel', () => {
    const title = link({ id: 'title-1', type: 'title', label: 'Mais', payload: { collapsible: true } })
    const child = link({ id: 'child-1' })
    const nextTitle = link({ id: 'title-2', type: 'title', label: 'Depois' })
    const afterTitle = link({ id: 'after' })
    const { sections } = groupPublicLinks([title, child, nextTitle, afterTitle])

    expect(sections).toEqual([
      { type: 'collapsible', title, children: [child] },
      { type: 'plain', link: nextTitle },
      { type: 'plain', link: afterTitle },
    ])
  })

  it('permite varias secoes colapsaveis independentes', () => {
    const title1 = link({ id: 't1', type: 'title', payload: { collapsible: true } })
    const child1 = link({ id: 'c1' })
    const title2 = link({ id: 't2', type: 'title', payload: { collapsible: true } })
    const child2 = link({ id: 'c2' })
    const { sections } = groupPublicLinks([title1, child1, title2, child2])

    expect(sections).toEqual([
      { type: 'collapsible', title: title1, children: [child1] },
      { type: 'collapsible', title: title2, children: [child2] },
    ])
  })

  it('extrai links de icone social pra fora, independente da posicao', () => {
    const insta = link({ id: 'insta', type: 'instagram' })
    const normal = link({ id: 'normal' })
    const { icons, sections } = groupPublicLinks([insta, normal])

    expect(icons).toEqual([insta])
    expect(sections).toEqual([{ type: 'plain', link: normal }])
  })

  it('extrai links de icone social mesmo de dentro de uma secao colapsavel', () => {
    const title = link({ id: 'title-1', type: 'title', payload: { collapsible: true } })
    const tiktok = link({ id: 'tt', type: 'tiktok' })
    const child = link({ id: 'child' })
    const { icons, sections } = groupPublicLinks([title, tiktok, child])

    expect(icons).toEqual([tiktok])
    expect(sections).toEqual([{ type: 'collapsible', title, children: [child] }])
  })

  it('descarta uma secao colapsavel que fica sem filhos depois de extrair os icones', () => {
    const title = link({ id: 'title-1', type: 'title', payload: { collapsible: true } })
    const onlyIcon = link({ id: 'yt', type: 'youtube' })
    const { icons, sections } = groupPublicLinks([title, onlyIcon])

    expect(icons).toEqual([onlyIcon])
    expect(sections).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run src/features/public/groupPublicLinks.test.ts
```
Esperado: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
import { isCollapsibleTitle } from '@/features/links/linkPayload'
import type { Link } from '@/features/links/useLinks'

const ICON_TYPES = new Set(['instagram', 'tiktok', 'telegram', 'youtube', 'spotify'])

export interface PlainLinkSection {
  type: 'plain'
  link: Link
}

export interface CollapsibleLinkSection {
  type: 'collapsible'
  title: Link
  children: Link[]
}

export type PublicLinkSection = PlainLinkSection | CollapsibleLinkSection

export function groupPublicLinks(links: Link[]): {
  icons: Link[]
  sections: PublicLinkSection[]
} {
  const icons = links.filter((item) => ICON_TYPES.has(item.type))
  const flow = links.filter((item) => !ICON_TYPES.has(item.type))

  const sections: PublicLinkSection[] = []
  let current: CollapsibleLinkSection | null = null

  for (const item of flow) {
    if (item.type === 'title' && isCollapsibleTitle(item)) {
      current = { type: 'collapsible', title: item, children: [] }
      sections.push(current)
      continue
    }

    if (item.type === 'title') {
      current = null
    }

    if (current) {
      current.children.push(item)
    } else {
      sections.push({ type: 'plain', link: item })
    }
  }

  return {
    icons,
    sections: sections.filter((section) => section.type !== 'collapsible' || section.children.length > 0),
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run src/features/public/groupPublicLinks.test.ts
```
Esperado: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/public/groupPublicLinks.ts src/features/public/groupPublicLinks.test.ts
git commit -m "feat: adiciona groupPublicLinks para particionar icones e secoes colapsaveis"
```

---

### Task 5: Componente `Collapsible` (shadcn) + `PublicCollapsibleSection`

**Files:**
- Create: `src/components/ui/collapsible.tsx`
- Create: `src/routes/public/components/PublicCollapsibleSection.tsx`
- Create: `src/routes/public/components/PublicCollapsibleSection.test.tsx`

- [ ] **Step 1: Criar a primitiva shadcn**

Rode `npx shadcn@latest add collapsible --yes`, ou crie o arquivo diretamente com este conteúdo (é exatamente o que o CLI gera nesta versão do registro `base-nova`):

```tsx
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

- [ ] **Step 2: Escrever o teste do `PublicCollapsibleSection`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Link } from '@/features/links/useLinks'
import type { CollapsibleLinkSection } from '@/features/public/groupPublicLinks'
import { PublicCollapsibleSection } from './PublicCollapsibleSection'

vi.mock('./PublicLinkBlock', () => ({
  PublicLinkBlock: ({ link }: { link: { id: string; label: string | null } }) => (
    <div>{link.label ?? link.id}</div>
  ),
}))

function makeSection(): CollapsibleLinkSection {
  return {
    type: 'collapsible',
    title: { id: 'title-1', label: 'Treinos' } as Link,
    children: [
      { id: 'child-1', label: 'Goleiro' } as Link,
      { id: 'child-2', label: 'Drible' } as Link,
    ],
  }
}

describe('PublicCollapsibleSection', () => {
  it('mostra o titulo da secao e comeca fechada', () => {
    render(<PublicCollapsibleSection section={makeSection()} onInteract={vi.fn()} />)

    expect(screen.getByText('Treinos')).toBeInTheDocument()
    expect(screen.queryByText('Goleiro')).not.toBeInTheDocument()
    expect(screen.queryByText('Drible')).not.toBeInTheDocument()
  })

  it('abre e mostra os filhos ao clicar no gatilho', async () => {
    const user = userEvent.setup()
    render(<PublicCollapsibleSection section={makeSection()} onInteract={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ver mais/i }))

    expect(await screen.findByText('Goleiro')).toBeInTheDocument()
    expect(screen.getByText('Drible')).toBeInTheDocument()
  })

  it('fecha de novo ao clicar uma segunda vez', async () => {
    const user = userEvent.setup()
    render(<PublicCollapsibleSection section={makeSection()} onInteract={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: /ver mais/i })
    await user.click(trigger)
    await screen.findByText('Goleiro')
    await user.click(trigger)

    expect(screen.queryByText('Goleiro')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npx vitest run src/routes/public/components/PublicCollapsibleSection.test.tsx
```
Esperado: FAIL (módulo não existe).

- [ ] **Step 4: Implementar `PublicCollapsibleSection.tsx`**

```tsx
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PublicLinkBlock } from './PublicLinkBlock'
import type { Link } from '@/features/links/useLinks'
import type { CollapsibleLinkSection } from '@/features/public/groupPublicLinks'

interface PublicCollapsibleSectionProps {
  section: CollapsibleLinkSection
  onInteract: (link: Link) => void
}

export function PublicCollapsibleSection({ section, onInteract }: PublicCollapsibleSectionProps) {
  return (
    <Collapsible defaultOpen={false} className="w-full">
      <p className="pt-2 pb-1 text-center text-xs font-semibold tracking-wide text-white/70 uppercase">
        {section.title.label}
      </p>
      <CollapsibleTrigger className="group flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/25 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-white/30">
        Ver mais
        <ChevronDown className="size-4 transition-transform group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 flex flex-col gap-3">
        {section.children.map((link) => (
          <PublicLinkBlock key={link.id} link={link} onInteract={onInteract} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npx vitest run src/routes/public/components/PublicCollapsibleSection.test.tsx
```
Esperado: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/collapsible.tsx src/routes/public/components/PublicCollapsibleSection.tsx src/routes/public/components/PublicCollapsibleSection.test.tsx
git commit -m "feat: adiciona Collapsible (shadcn) e PublicCollapsibleSection"
```

---

### Task 6: `PublicSocialIcons` (ícones de marca no rodapé)

**Files:**
- Modify: `package.json` (nova dependência)
- Create: `src/routes/public/components/PublicSocialIcons.tsx`
- Create: `src/routes/public/components/PublicSocialIcons.test.tsx`

- [ ] **Step 1: Instalar a dependência**

```bash
npm install @icons-pack/react-simple-icons
```

- [ ] **Step 2: Escrever o teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Link } from '@/features/links/useLinks'
import { PublicSocialIcons } from './PublicSocialIcons'

function link(overrides: Partial<Link>): Link {
  return {
    id: 'id',
    page_id: 'page-1',
    order: 0,
    label: null,
    url: null,
    payload: {},
    is_active: true,
    type: 'link',
    ...overrides,
  } as Link
}

describe('PublicSocialIcons', () => {
  it('renderiza um link por icone suportado, com o href resolvido', () => {
    render(
      <PublicSocialIcons
        icons={[link({ id: 'insta', type: 'instagram', url: 'meuuser' })]}
        onInteract={vi.fn()}
      />,
    )

    const anchor = screen.getByRole('link')
    expect(anchor).toHaveAttribute('href', 'https://instagram.com/meuuser')
  })

  it('renderiza um link para cada tipo suportado', () => {
    render(
      <PublicSocialIcons
        icons={[
          link({ id: '1', type: 'instagram', url: 'a' }),
          link({ id: '2', type: 'tiktok', url: 'b' }),
          link({ id: '3', type: 'telegram', url: 'c' }),
          link({ id: '4', type: 'youtube', url: 'https://youtube.com/x' }),
          link({ id: '5', type: 'spotify', url: 'https://open.spotify.com/x' }),
        ]}
        onInteract={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('nao renderiza nada para um link sem url resolvivel', () => {
    render(
      <PublicSocialIcons icons={[link({ id: 'insta', type: 'instagram', url: null })]} onInteract={vi.fn()} />,
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('chama onInteract ao clicar', async () => {
    const user = userEvent.setup()
    const onInteract = vi.fn()
    const igLink = link({ id: 'insta', type: 'instagram', url: 'meuuser' })
    render(<PublicSocialIcons icons={[igLink]} onInteract={onInteract} />)

    await user.click(screen.getByRole('link'))

    expect(onInteract).toHaveBeenCalledWith(igLink)
  })
})
```

- [ ] **Step 3: Rodar e confirmar que falha**

```bash
npx vitest run src/routes/public/components/PublicSocialIcons.test.tsx
```
Esperado: FAIL (módulo não existe).

- [ ] **Step 4: Implementar**

```tsx
import { SiInstagram, SiSpotify, SiTelegram, SiTiktok, SiYoutube } from '@icons-pack/react-simple-icons'
import { resolveLinkHref } from '@/features/public/resolveLinkHref'
import type { Link } from '@/features/links/useLinks'

const ICON_COMPONENTS: Partial<Record<string, typeof SiInstagram>> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  telegram: SiTelegram,
  youtube: SiYoutube,
  spotify: SiSpotify,
}

interface PublicSocialIconsProps {
  icons: Link[]
  onInteract: (link: Link) => void
}

export function PublicSocialIcons({ icons, onInteract }: PublicSocialIconsProps) {
  return (
    <div className="flex items-center justify-center gap-5 pt-2">
      {icons.map((link) => {
        const Icon = ICON_COMPONENTS[link.type]
        const href = resolveLinkHref(link)
        if (!Icon || !href) return null

        return (
          <a
            key={link.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onInteract(link)}
            aria-label={link.type}
          >
            <Icon size={26} color="#ffffff" />
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

```bash
npx vitest run src/routes/public/components/PublicSocialIcons.test.tsx
```
Esperado: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/routes/public/components/PublicSocialIcons.tsx src/routes/public/components/PublicSocialIcons.test.tsx
git commit -m "feat: adiciona PublicSocialIcons com icones de marca reais (simple-icons)"
```

---

### Task 7: Restyle do `PublicLinkBlock` (fundo colorido fixo)

**Files:**
- Modify: `src/routes/public/components/PublicLinkBlock.tsx`

- [ ] **Step 1: Trocar as classes de título/texto/botão**

O componente passa a assumir um fundo colorido fixo (ver Task 8), não mais os tokens `--foreground`/`--muted-foreground`/`--primary` do resto do app. Substitua:

```tsx
  if (link.type === 'title') {
    return <h2 className="pt-2 text-center text-lg font-semibold">{link.label}</h2>
  }

  if (link.type === 'text') {
    return <p className="text-center text-sm text-muted-foreground">{link.label}</p>
  }
```

por:

```tsx
  if (link.type === 'title') {
    return <h2 className="pt-2 text-center text-lg font-semibold text-white">{link.label}</h2>
  }

  if (link.type === 'text') {
    return <p className="text-center text-sm text-white/80">{link.label}</p>
  }
```

E substitua:

```tsx
const buttonClassName =
  'block w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground shadow-sm transition hover:scale-[1.02] hover:bg-brand-purple-dark'
```

por:

```tsx
const buttonClassName =
  'block w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-primary shadow-sm transition hover:scale-[1.02] hover:bg-white/90'
```

- [ ] **Step 2: Rodar os testes existentes**

```bash
npx vitest run src/routes/public/components/PublicLinkBlock.test.tsx
```
Esperado: PASS (nenhuma asserção existente depende de classe/cor específica).

- [ ] **Step 3: Commit**

```bash
git add src/routes/public/components/PublicLinkBlock.tsx
git commit -m "style: PublicLinkBlock passa a usar botoes brancos sobre fundo colorido fixo"
```

---

### Task 8: `PublicPagePage` — novo layout completo

**Files:**
- Modify: `src/routes/public/PublicPagePage.tsx`
- Modify: `src/routes/public/PublicPagePage.test.tsx`
- Delete: `src/components/theme/ThemeToggle.tsx`
- Delete: `src/components/theme/ThemeToggle.test.tsx`

- [ ] **Step 1: Remover o `ThemeToggle`, que fica órfão**

Depois desta task, `ThemeToggle` não é mais usado em lugar nenhum (o admin usa a seção "Aparência" em Configurações, ver `SettingsPage.tsx`). Delete os dois arquivos:

```bash
git rm src/components/theme/ThemeToggle.tsx src/components/theme/ThemeToggle.test.tsx
```

- [ ] **Step 2: Reescrever `PublicPagePage.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicPage } from '@/features/public/usePublicPage'
import { useLinks, type Link } from '@/features/links/useLinks'
import { recordAnalyticsEvent } from '@/features/public/analytics'
import { isCopyOnlyLink } from '@/features/public/resolveLinkHref'
import { groupPublicLinks } from '@/features/public/groupPublicLinks'
import { PublicLinkBlock } from './components/PublicLinkBlock'
import { PublicCollapsibleSection } from './components/PublicCollapsibleSection'
import { PublicSocialIcons } from './components/PublicSocialIcons'

export default function PublicPagePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: page, isLoading, isError } = usePublicPage(slug)
  const { data: links } = useLinks(page?.id)
  const viewedPageIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (page && viewedPageIdRef.current !== page.id) {
      viewedPageIdRef.current = page.id
      void recordAnalyticsEvent({ pageId: page.id, eventType: 'view' })
    }
  }, [page])

  function handleLinkInteract(link: Link) {
    if (!page) return
    void recordAnalyticsEvent({ pageId: page.id, linkId: link.id, eventType: 'click' })

    if (isCopyOnlyLink(link.type) && link.url) {
      navigator.clipboard?.writeText(link.url)
      toast.success('Chave Pix copiada!')
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center gap-4 p-6 pt-16">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (isError || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Esta página não existe ou não está mais disponível.
        </p>
      </div>
    )
  }

  const activeLinks = (links ?? []).filter((link) => link.is_active)
  const { icons, sections } = groupPublicLinks(activeLinks)

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#6518EA_0%,#AD7DFF_45%,#FFE796_100%)]">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6 p-6 pt-16">
        {page.avatar_url && (
          <img
            src={page.avatar_url}
            alt={page.title}
            className="size-20 rounded-full object-cover shadow-lg"
          />
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold text-white">{page.title}</h1>
          {page.description && <p className="text-sm text-white/80">{page.description}</p>}
        </div>

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

- [ ] **Step 3: Atualizar `PublicPagePage.test.tsx`**

Adicione os mocks dos dois componentes novos (mesma lógica do mock já existente de `PublicLinkBlock`, mantendo o teste focado em orquestração, não nos detalhes internos desses componentes):

```tsx
vi.mock('./components/PublicCollapsibleSection', () => ({
  PublicCollapsibleSection: ({
    section,
  }: {
    section: { title: { label: string | null } }
  }) => <div>Secao: {section.title.label}</div>,
}))

vi.mock('./components/PublicSocialIcons', () => ({
  PublicSocialIcons: ({ icons }: { icons: Array<{ id: string }> }) => <div>Icones: {icons.length}</div>,
}))
```

(coloque esse bloco logo depois do `vi.mock('./components/PublicLinkBlock', ...)` já existente.)

Adicione estes 4 testes ao final do `describe('PublicPagePage', ...)`:

```tsx
  it('exibe o avatar quando a pagina tem avatar_url', () => {
    usePublicPageMock.mockReturnValue({
      data: { ...page, avatar_url: 'https://exemplo.com/foto.png' },
      isLoading: false,
      isError: false,
    })
    const { container } = renderPublicPage()

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://exemplo.com/foto.png')
  })

  it('nao exibe avatar quando a pagina nao tem avatar_url', () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    const { container } = renderPublicPage()

    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('renderiza uma secao colapsavel quando ha um titulo marcado como collapsible', () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    useLinksMock.mockReturnValue({
      data: [
        {
          id: 'title-1',
          type: 'title',
          label: 'Mais links',
          payload: { collapsible: true },
          is_active: true,
        },
        { id: 'link-1', type: 'link', label: 'Escondido', payload: {}, is_active: true },
      ],
      isLoading: false,
      isError: false,
    })

    renderPublicPage()

    expect(screen.getByText('Secao: Mais links')).toBeInTheDocument()
  })

  it('renderiza a fileira de icones sociais quando ha links do tipo suportado', () => {
    usePublicPageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    useLinksMock.mockReturnValue({
      data: [{ id: 'ig-1', type: 'instagram', label: null, url: '@x', payload: {}, is_active: true }],
      isLoading: false,
      isError: false,
    })

    renderPublicPage()

    expect(screen.getByText('Icones: 1')).toBeInTheDocument()
  })
```

- [ ] **Step 4: Rodar os testes**

```bash
npx vitest run src/routes/public/PublicPagePage.test.tsx
```
Esperado: PASS (9 testes — 5 já existentes + 4 novos).

- [ ] **Step 5: Rodar o typecheck e o lint**

```bash
npm run typecheck
npm run lint
```
Esperado: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: PublicPagePage ganha avatar, secoes colapsaveis, icones sociais e visual fixo"
```

---

### Task 9: `useUploadPageAvatar`

**Files:**
- Create: `src/features/pages/useUploadPageAvatar.ts`
- Create: `src/features/pages/useUploadPageAvatar.test.tsx`

- [ ] **Step 1: Escrever o teste**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import { useUploadPageAvatar } from './useUploadPageAvatar'

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeFile() {
  return new File(['conteudo'], 'foto.png', { type: 'image/png' })
}

describe('useUploadPageAvatar', () => {
  it('sobe o arquivo, pega a url publica e atualiza avatar_url', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/x/page-1.png' } })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload, getPublicUrl } as never)

    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'page-1', avatar_url: 'https://cdn/x/page-1.png' }, error: null })
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUploadPageAvatar(), { wrapper: createWrapper() })
    result.current.mutate({ pageId: 'page-1', ownerId: 'owner-1', file: makeFile() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(supabase.storage.from).toHaveBeenCalledWith('page-avatars')
    expect(upload).toHaveBeenCalledWith('owner-1/page-1.png', expect.any(File), { upsert: true })
    expect(getPublicUrl).toHaveBeenCalledWith('owner-1/page-1.png')
    expect(update).toHaveBeenCalledWith({ avatar_url: 'https://cdn/x/page-1.png' })
    expect(eq).toHaveBeenCalledWith('id', 'page-1')
  })

  it('propaga o erro quando o upload falha, sem tentar atualizar a pagina', async () => {
    const upload = vi.fn().mockResolvedValue({ error: new Error('falhou') })
    vi.mocked(supabase.storage.from).mockReturnValue({ upload } as never)
    const update = vi.fn()
    vi.mocked(supabase.from).mockReturnValue({ update } as never)

    const { result } = renderHook(() => useUploadPageAvatar(), { wrapper: createWrapper() })
    result.current.mutate({ pageId: 'page-1', ownerId: 'owner-1', file: makeFile() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run src/features/pages/useUploadPageAvatar.test.tsx
```
Esperado: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

const BUCKET = 'page-avatars'

export function useUploadPageAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pageId,
      ownerId,
      file,
    }: {
      pageId: string
      ownerId: string
      file: File
    }) => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${ownerId}/${pageId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { data, error } = await supabase
        .from('pages')
        .update({ avatar_url: publicUrl })
        .eq('id', pageId)
        .select()
        .single()

      if (error) throw error
      return data as Tables<'pages'>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.setQueryData(['pages', 'detail', data.id], data)
    },
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run src/features/pages/useUploadPageAvatar.test.tsx
```
Esperado: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/pages/useUploadPageAvatar.ts src/features/pages/useUploadPageAvatar.test.tsx
git commit -m "feat: adiciona useUploadPageAvatar (upload no Storage + update de pages.avatar_url)"
```

---

### Task 10: `AvatarUploader`

**Files:**
- Create: `src/routes/pages/components/AvatarUploader.tsx`
- Create: `src/routes/pages/components/AvatarUploader.test.tsx`

- [ ] **Step 1: Escrever o teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const uploadMutate = vi.fn()
const uploadState = { isPending: false }
vi.mock('@/features/pages/useUploadPageAvatar', () => ({
  useUploadPageAvatar: () => ({ mutate: uploadMutate, get isPending() { return uploadState.isPending } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { AvatarUploader } from './AvatarUploader'

describe('AvatarUploader', () => {
  beforeEach(() => {
    uploadMutate.mockReset()
    uploadState.isPending = false
  })

  it('exibe a foto atual quando ha avatarUrl', () => {
    render(<AvatarUploader pageId="page-1" ownerId="owner-1" avatarUrl="https://exemplo.com/foto.png" />)

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://exemplo.com/foto.png')
  })

  it('nao exibe imagem quando nao ha avatarUrl', () => {
    render(<AvatarUploader pageId="page-1" ownerId="owner-1" avatarUrl={null} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('envia o arquivo selecionado pro hook de upload', async () => {
    const user = userEvent.setup()
    render(<AvatarUploader pageId="page-1" ownerId="owner-1" avatarUrl={null} />)

    const file = new File(['conteudo'], 'foto.png', { type: 'image/png' })
    const input = screen.getByTestId('avatar-input')
    await user.upload(input, file)

    expect(uploadMutate).toHaveBeenCalledWith(
      { pageId: 'page-1', ownerId: 'owner-1', file },
      expect.anything(),
    )
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx vitest run src/routes/pages/components/AvatarUploader.test.tsx
```
Esperado: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```tsx
import { useRef, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { LumaSpin } from '@/components/ui/luma-spin'
import { useUploadPageAvatar } from '@/features/pages/useUploadPageAvatar'

interface AvatarUploaderProps {
  pageId: string
  ownerId: string
  avatarUrl: string | null
}

export function AvatarUploader({ pageId, ownerId, avatarUrl }: AvatarUploaderProps) {
  const uploadAvatar = useUploadPageAvatar()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    uploadAvatar.mutate(
      { pageId, ownerId, file },
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
          avatarUrl && <img src={avatarUrl} alt="" className="size-full object-cover" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Alterar foto"
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition hover:bg-black/40 hover:text-white"
        >
          <Camera className="size-5" />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        data-testid="avatar-input"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run src/routes/pages/components/AvatarUploader.test.tsx
```
Esperado: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/routes/pages/components/AvatarUploader.tsx src/routes/pages/components/AvatarUploader.test.tsx
git commit -m "feat: adiciona AvatarUploader (upload de foto da arvore no editor)"
```

---

### Task 11: `AvatarUploader` dentro do `PageEditPage`

**Files:**
- Modify: `src/routes/pages/PageEditPage.tsx`
- Modify: `src/routes/pages/PageEditPage.test.tsx`

- [ ] **Step 1: Importar e renderizar o `AvatarUploader`**

Adicione o import:

```ts
import { AvatarUploader } from './components/AvatarUploader'
```

E, dentro do `<CardContent>` do card "Detalhes", logo antes do `<form ...>`, adicione:

```tsx
        <CardContent>
          <AvatarUploader pageId={page.id} ownerId={page.owner_id} avatarUrl={page.avatar_url} />
          <form className="flex flex-col gap-4" noValidate>
```

(mantendo o `<form>` e seu conteúdo exatamente como já estão — só adiciona o `AvatarUploader` como irmão anterior a ele, dentro do mesmo `CardContent`.)

- [ ] **Step 2: Atualizar o teste**

Em `src/routes/pages/PageEditPage.test.tsx`, adicione o mock (junto aos outros mocks de componentes, perto do mock de `./components/LinkBlockCard`):

```tsx
vi.mock('./components/AvatarUploader', () => ({
  AvatarUploader: ({ pageId }: { pageId: string }) => <div>Avatar de {pageId}</div>,
}))
```

E adicione `avatar_url: null` ao objeto `page` de fixture (junto aos demais campos como `theme_id`, `settings`, etc.).

Adicione este teste ao final do `describe('PageEditPage', ...)`:

```tsx
  it('renderiza o uploader de avatar', () => {
    usePageMock.mockReturnValue({ data: page, isLoading: false, isError: false })
    renderEdit()

    expect(screen.getByText('Avatar de page-1')).toBeInTheDocument()
  })
```

- [ ] **Step 3: Rodar os testes**

```bash
npx vitest run src/routes/pages/PageEditPage.test.tsx
```
Esperado: PASS (todos os testes existentes + o novo).

- [ ] **Step 4: Rodar o typecheck**

```bash
npm run typecheck
```
Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/routes/pages/PageEditPage.tsx src/routes/pages/PageEditPage.test.tsx
git commit -m "feat: PageEditPage exibe o AvatarUploader no card de detalhes"
```

---

### Task 12: Toggle "Colapsável" no bloco Título (`LinkBlockCard`)

**Files:**
- Modify: `src/routes/pages/components/LinkBlockCard.tsx`
- Modify: `src/routes/pages/components/LinkBlockCard.test.tsx`

- [ ] **Step 1: Importar o helper e adicionar o handler**

Adicione o import:

```ts
import { isCollapsibleTitle, withCollapsible } from '@/features/links/linkPayload'
```

E, junto aos outros handlers (`handleToggleActive`, `handleDelete`), adicione:

```ts
  function handleToggleCollapsible(checked: boolean) {
    updateLink.mutate({ id: link.id, values: { payload: withCollapsible(link.payload, checked) } })
  }
```

- [ ] **Step 2: Renderizar o `Switch` só para blocos do tipo `title`**

No bloco de controles à direita do card (onde já está o `Switch` de `is_active` e o botão de excluir), adicione o novo `Switch` condicional logo acima do já existente:

```tsx
      <div className="flex flex-col items-center gap-2">
        {link.type === 'title' && (
          <Switch
            checked={isCollapsibleTitle(link)}
            onCheckedChange={handleToggleCollapsible}
            aria-label="Colapsável"
          />
        )}
        <Switch
          checked={link.is_active}
          onCheckedChange={handleToggleActive}
          aria-label={link.is_active ? 'Bloco ativo' : 'Bloco inativo'}
        />
```

(o restante do bloco — `AlertDialog` de excluir — continua igual.)

- [ ] **Step 3: Escrever os testes**

Adicione ao final do `describe('LinkBlockCard', ...)` em `src/routes/pages/components/LinkBlockCard.test.tsx`:

```tsx
  it('mostra o switch Colapsavel apenas para blocos do tipo titulo', () => {
    renderCard({ ...baseLink, type: 'title' })
    expect(screen.getByRole('switch', { name: 'Colapsável' })).toBeInTheDocument()
  })

  it('nao mostra o switch Colapsavel para outros tipos de bloco', () => {
    renderCard({ ...baseLink, type: 'link' })
    expect(screen.queryByRole('switch', { name: 'Colapsável' })).not.toBeInTheDocument()
  })

  it('liga o payload.collapsible ao ativar o switch', async () => {
    const user = userEvent.setup()
    renderCard({ ...baseLink, type: 'title', payload: {} })

    await user.click(screen.getByRole('switch', { name: 'Colapsável' }))

    expect(updateMutate).toHaveBeenCalledWith({ id: 'link-1', values: { payload: { collapsible: true } } })
  })
```

- [ ] **Step 4: Rodar os testes**

```bash
npx vitest run src/routes/pages/components/LinkBlockCard.test.tsx
```
Esperado: PASS (todos os testes existentes + os 3 novos).

- [ ] **Step 5: Rodar o typecheck**

```bash
npm run typecheck
```
Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/routes/pages/components/LinkBlockCard.tsx src/routes/pages/components/LinkBlockCard.test.tsx
git commit -m "feat: LinkBlockCard ganha switch Colapsavel para blocos do tipo titulo"
```

---

### Task 13: Atualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Adicionar uma linha em "Project status"**

Logo depois da linha "Aponti color palette + dark/light toggle (2026-07-20): done...", adicione:

```
Redesign da página pública (2026-07-21): done — a página pública (`/:slug`) ganhou um visual próprio e fixo (degradê roxo→amarelo, botões brancos), independente do tema claro/escuro do visitante — o que tornou o `ThemeToggle` órfão, removido junto. Nova coluna `pages.avatar_url` (upload real via um bucket dedicado no Supabase Storage, `page-avatars`, com policy por dono) mostra a foto de cada árvore no topo. Links dos tipos Instagram/TikTok/Telegram/YouTube/Spotify agora sempre renderizam como ícone de marca real (`@icons-pack/react-simple-icons`) numa fileira no rodapé, independente de onde estejam na ordem dos blocos — inclusive se estiverem dentro de uma seção colapsável. Um bloco "Título" pode ser marcado como colapsável (`links.payload.collapsible`, reaproveitando a coluna jsonb que já existia); todo link seguinte até o próximo título vira filho dela, escondido atrás de um `Collapsible` (shadcn/Base UI) que começa fechado. Ver `docs/superpowers/specs/2026-07-21-redesign-pagina-publica-design.md` e `docs/superpowers/plans/2026-07-21-redesign-pagina-publica.md`.
```

- [ ] **Step 2: Atualizar a seção "Architecture"**

Na linha do `src/components/ui/` que lista as primitivas shadcn, adicione `collapsible` à lista (junto de `sidebar`, `breadcrumb`, etc.).

Adicione uma nova linha logo após a linha do `src/features/public/` já existente:

```
- `src/features/public/groupPublicLinks.ts` — função pura que particiona os links ativos de uma página em `icons` (tipos `instagram`/`tiktok`/`telegram`/`youtube`/`spotify`, extraídos pra fora da posição original) e `sections` (blocos `plain` ou `collapsible`) — um bloco `title` com `payload.collapsible === true` abre uma seção que absorve todo link seguinte até o próximo `title` (colapsável ou não) ou o fim da lista; seções que ficam sem filhos depois da extração dos ícones são descartadas. `src/features/links/linkPayload.ts` tem os helpers `isCollapsibleTitle`/`withCollapsible` usados tanto aqui quanto no editor (`LinkBlockCard`), reaproveitando `links.payload` (jsonb já existente, sem migration nova pra isso). `PublicCollapsibleSection.tsx`/`PublicSocialIcons.tsx` (`src/routes/public/components/`) renderizam essas duas peças novas — o segundo usa `@icons-pack/react-simple-icons` para ícones de marca reais (branco liso, sem lucide-react já que essa lib não tem ícones de marca nesta versão).
```

Atualize a linha do `src/features/pages/` para mencionar `useUploadPageAvatar.ts` (sobe o arquivo pro bucket `page-avatars` no caminho `{ownerId}/{pageId}.{ext}` com `upsert: true`, depois grava a URL pública em `pages.avatar_url`) e o novo campo `avatar_url` sendo copiado por `useDuplicatePage`.

Substitua a antiga linha do `ThemeToggle` (que dizia "Only rendered in PublicPagePage now...") — o componente foi removido, não existe mais.

- [ ] **Step 3: Atualizar "Domain model"**

Na lista de tabelas/colunas, adicione: `pages.avatar_url` (text, nullable, adicionado 2026-07-21) e o bucket `page-avatars` no Supabase Storage (público para leitura, restrito por dono — `(storage.foldername(name))[1] = auth.uid()` — para insert/update/delete).

- [ ] **Step 4: Atualizar "Screens / feature surface"**

Reescreva o parágrafo do **Public page** para refletir o novo layout (avatar, seções colapsáveis, ícones sociais, visual fixo) em vez do parágrafo atual.

- [ ] **Step 5: Atualizar "Known gaps / next steps"**

Mova o item "No avatar/photo or `@username` shown on the public page" para a lista de resolvidos, com `~~riscado~~`, explicando que `pages.avatar_url` + upload resolveram a parte da foto (o `@username` continua fora, não fazia parte deste escopo).

Atualize a linha "Image/Video blocks store a URL only — no upload flow (Supabase Storage isn't configured)" removendo "Supabase Storage isn't configured" (agora está, só que apenas para o bucket de avatar) e deixando claro que Imagem/Vídeo continuam sem upload.

Atualize a linha do `social_links` table para registrar que este redesign reforçou a decisão de manter os ícones sociais como `links` (não migrar para `social_links`), sem de fato remover a tabela ainda.

- [ ] **Step 6: Rodar a suíte inteira, o typecheck, o lint e o build**

```bash
npx vitest run
npm run typecheck
npm run lint
npm run build
```
Esperado: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md com o redesign da pagina publica"
```

---

### Task 14: Push e abertura do PR

- [ ] **Step 1: Push**

```bash
git push -u origin feature/redesign-pagina-publica
```

- [ ] **Step 2: Abrir o PR**

```bash
gh pr create \
  --repo apontiacademy/arvoreAponti-pe-aponti26dev \
  --base develop \
  --head feature/redesign-pagina-publica \
  --title "feat: redesign da pagina publica (avatar, secao colapsavel, icones sociais)" \
  --body "Adiciona avatar por arvore (upload real via Supabase Storage), secoes colapsaveis nos blocos (marca-se um bloco Titulo como colapsavel e tudo que vem depois vira filho dele), e uma fileira de icones de marca reais (Instagram/TikTok/Telegram/YouTube/Spotify) no rodape da pagina publica. A pagina publica ganha um visual fixo (degrade roxo->amarelo, botoes brancos), independente do tema claro/escuro do visitante -- o ThemeToggle, que so era usado ali, foi removido."
```

- [ ] **Step 3: Conferir CI**

```bash
gh pr checks feature/redesign-pagina-publica --repo apontiacademy/arvoreAponti-pe-aponti26dev
```
Esperado: todos os checks passam. Se algum falhar, corrigir na própria branch, commitar e repetir.

---

## Self-Review (preenchido após escrever o plano)

- **Cobertura do spec:** modelo de dados (Task 1), `useDuplicatePage` copiando avatar (Task 2, extensão pequena e justificada não coberta explicitamente no spec mas consistente com o resto do comportamento de duplicar), helpers de payload (Task 3), agrupamento (Task 4), Collapsible + seção pública (Task 5), ícones sociais (Task 6), restyle do botão (Task 7), página pública completa (Task 8), upload de avatar — hook e componente (Tasks 9-10), integração no editor (Task 11), toggle colapsável no editor (Task 12), documentação (Task 13), PR (Task 14). Todo item do "Entra" do spec tem uma task correspondente.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todas as etapas têm código completo. A Task 5 permite rodar o CLI do shadcn OU colar o conteúdo exato já capturado (o CLI é interativo/depende de rede; o conteúdo colado é idêntico ao que ele gera nesta versão do registro, então não é um placeholder — é o resultado real, já verificado).
- **Consistência de tipos:** `PublicLinkSection`/`CollapsibleLinkSection`/`PlainLinkSection` (Task 4) são os mesmos tipos consumidos em `PublicPagePage` (Task 8) e `PublicCollapsibleSection` (Task 5). `isCollapsibleTitle`/`withCollapsible` (Task 3) têm a mesma assinatura em todos os pontos que os usam (Task 4 e Task 12). `useUploadPageAvatar` usa `{ pageId, ownerId, file }` (Task 9), mesmo shape usado por `AvatarUploader` (Task 10) e `PageEditPage` (Task 11).
