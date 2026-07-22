# Redesign da página pública (avatar, seção colapsável, ícones sociais) — design

Data: 2026-07-21

## Contexto

Hoje a página pública (`/:slug`) renderiza `page.title`/`page.description` e a lista de blocos ativos em sequência flat, todos com o mesmo estilo de botão roxo sólido, sem foto de perfil e sem tratamento visual próprio (herda o fundo/tokens do resto do app). O usuário trouxe dois exemplos de referência (estilo Linktree) mostrando uma estrutura diferente: avatar no topo, links gerais como botões, uma seção com título seguida de um grupo de links "específicos" atrás de um controle expansível, e redes sociais como ícones no rodapé. Este spec redesenha a página pública nessa estrutura, usando a paleta oficial Aponti.

## Escopo

**Entra:**
- Coluna `pages.avatar_url` + upload de imagem via Supabase Storage (bucket novo `page-avatars`), com UI de upload no editor (`PageEditPage`).
- Seção colapsável: um bloco "Título" pode ser marcado como colapsável (`links.payload.collapsible`); todo link seguinte até o próximo título (ou fim da lista) vira filho dessa seção na página pública, escondido atrás de um `Collapsible` (shadcn) que começa fechado.
- Ícones sociais no rodapé: links do tipo `instagram`/`tiktok`/`telegram`/`youtube`/`spotify` sempre renderizam como ícone (sem texto) numa fileira no final da página pública, independente da posição original — inclusive se estiverem dentro de uma seção colapsável. Ícones de marca reais via `@icons-pack/react-simple-icons` (dependência nova).
- Redesign visual da página pública: fundo em degradê roxo→amarelo (`#6518EA → #AD7DFF → #FFE796`), botões brancos com texto roxo (inverte o roxo-sólido atual), texto branco para título/descrição/rótulos de seção. Remove o `ThemeToggle` dessa página — o visual passa a ser fixo, parte da identidade da árvore, e não do tema do visitante.

**Não entra:**
- Upload de imagem para os blocos Imagem/Vídeo do editor (continuam por URL colada).
- Atribuição explícita de link a uma seção fora da ordem (grupo é sempre "tudo depois do título colapsável até o próximo título").
- Múltiplos tipos de ícone sociais além dos 5 já suportados (não adiciona ex: X/Twitter, Discord como novo `links.type`).
- Presets de tema por página (`themes` table) — continua fora, sem relação com este redesign.

## Modelo de dados

```sql
alter table pages add column avatar_url text;

insert into storage.buckets (id, name, public)
values ('page-avatars', 'page-avatars', true)
on conflict (id) do nothing;

create policy "page_avatars_public_read"
on storage.objects for select
using (bucket_id = 'page-avatars');

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

Caminho do arquivo: `{owner_id}/{page_id}.{ext}` — upload usa `upsert: true`, então reenviar substitui o arquivo anterior sem acumular lixo no bucket. `pages.avatar_url` guarda a URL pública (`getPublicUrl`), lida por qualquer visitante já que o bucket é público — sem mudança de RLS em `pages` (a coluna nova segue as mesmas policies de leitura/escrita já existentes).

Seção colapsável não tem coluna nova: reaproveita `links.payload` (jsonb, já existe, hoje sem uso real). Só o tipo `title` respeita a chave `collapsible`; nos demais tipos ela é ignorada.

Após a migration, regenerar `src/lib/database.types.ts` (Supabase MCP `generate_typescript_types`).

## Frontend

### Agrupamento (`src/features/public/groupPublicLinks.ts`)

Função pura `groupPublicLinks(links: Link[])` que devolve `{ icons: Link[]; sections: Section[] }`, onde `Section` é `{ type: 'plain'; link: Link }` ou `{ type: 'collapsible'; title: Link; children: Link[] }`:
1. Extrai para `icons` todo link com `type` em `instagram`/`tiktok`/`telegram`/`youtube`/`spotify`, não importa a posição.
2. Percorre o restante em ordem: um `title` com `payload.collapsible === true` abre uma nova seção colapsável; links seguintes entram como filhos dela até o próximo `title` (colapsável ou não) ou o fim da lista; qualquer link antes do primeiro título colapsável (ou quando não há título colapsável ativo) vira um `Section` do tipo `plain`.
3. Seções colapsáveis sem nenhum filho (ex: só tinha links de ícone, que já foram extraídos) são descartadas do resultado.

### Página pública (`PublicPagePage.tsx`)

Nova ordem de renderização: avatar (`page.avatar_url`, círculo — se vazio, não renderiza nada, mesmo padrão já usado pra `description` opcional) → nome/bio → `sections.map(...)` (blocos `plain` via `PublicLinkBlock` já existente; blocos `collapsible` via novo `PublicCollapsibleSection`) → `PublicSocialIcons` no rodapé com `icons`. Remove o `<ThemeToggle />` que hoje fica fixo no canto superior direito dessa página.

Fundo: `linear-gradient(160deg, #6518EA 0%, #AD7DFF 45%, #FFE796 100%)` cobrindo a página inteira (substitui o fundo herdado do `body`/tokens do resto do app — este componente passa a ter contexto visual próprio, fixo, não ligado a `--background`/dark mode). Título e descrição em texto branco.

### `PublicLinkBlock.tsx` (ajuste de estilo)

Botões (`link`/`whatsapp`/`pix`/`email`/`phone`) trocam de `bg-primary text-primary-foreground` para branco sólido com texto roxo (`bg-white text-primary`), mantendo `rounded-xl`/hover scale. `title`/`text` passam a usar branco (`text-white`/`text-white/80`) em vez dos tokens `text-foreground`/`text-muted-foreground` — coerente com o novo fundo colorido fixo, que não é mais o mesmo contexto visual do resto do app.

### `PublicCollapsibleSection.tsx` (novo)

Usa o `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` do shadcn (adicionado via `npx shadcn add collapsible`, ainda não existe no projeto — primitiva `@base-ui/react`, mesmo padrão dos demais componentes). Título da seção como rótulo (texto branco, pequeno, maiúsculo) acima de um "balão" (botão translúcido branco, ex: `bg-white/25 text-white`) com o texto do próprio bloco Título + um chevron que gira ao abrir; conteúdo (`children`) começa fechado, renderiza cada filho via `PublicLinkBlock`.

### `PublicSocialIcons.tsx` (novo)

Recebe `icons: Link[]`, mapeia `type` → componente do `@icons-pack/react-simple-icons` (`SiInstagram`, `SiTiktok`, `SiTelegram`, `SiYoutube`, `SiSpotify`), renderiza como `<a target="_blank">` (mesma resolução de href via `resolveLinkHref` já existente) numa fileira centralizada, ícone branco liso (`color="white"`), sem fundo/círculo — igual aos exemplos de referência. Tipos sem ícone mapeado (não deveria acontecer, já que só os 5 tipos chegam aqui) são ignorados silenciosamente.

### Editor (`PageEditPage.tsx` + `AvatarUploader.tsx`)

Novo componente `src/routes/pages/components/AvatarUploader.tsx`: círculo mostrando `page.avatar_url` atual (ou vazio) com um botão de câmera sobreposto que abre `<input type="file" accept="image/*" className="sr-only">`. Ao selecionar um arquivo, chama `useUploadPageAvatar({ pageId, ownerId, file })` (novo hook em `src/features/pages/useUploadPageAvatar.ts`): sobe o arquivo pro bucket `page-avatars` no caminho `{ownerId}/{pageId}.{ext}` (`upsert: true`), pega a URL pública, e faz `update` em `pages.avatar_url`; invalida a query `['page', pageId]`. Mostra `LumaSpin` (já existe, ver commit anterior) enquanto sobe, `toast.success`/`toast.error` ao final — mesmo padrão das demais mutações. Renderizado no topo do card de detalhes em `PageEditPage`.

### Editor — toggle colapsável (`LinkBlockCard.tsx`)

Quando `link.type === 'title'`, o card ganha um `Switch` extra "Colapsável" ao lado do `is_active` já existente, ligado a `payload.collapsible` (default `false`); autosalva no mesmo debounce dos outros campos do card. Nenhuma mudança na lista/drag-and-drop do editor — o agrupamento em seção só existe na hora de montar a página pública.

## Testes

- `groupPublicLinks.test.ts`: sem seção (comportamento atual preservado), uma seção, várias seções, ícones extraídos de dentro de uma seção, seção que fica vazia (só tinha ícones) e é descartada, link de ícone fora de qualquer seção.
- `PublicCollapsibleSection.test.tsx`: começa fechado; clique no balão expande/mostra os filhos; clique de novo recolhe.
- `PublicSocialIcons.test.tsx`: renderiza um ícone por link suportado, com o href resolvido corretamente.
- `useUploadPageAvatar.test.tsx`: sucesso (chama upload, getPublicUrl, update, invalida query) e erro (toast, não atualiza `avatar_url`).
- `AvatarUploader.test.tsx`: seleção de arquivo dispara a mutation com o arquivo certo.
- Ajusta `PublicPagePage.test.tsx`/`PublicLinkBlock.test.tsx`/`LinkBlockCard.test.tsx` existentes pro novo layout/estilo/toggle.
