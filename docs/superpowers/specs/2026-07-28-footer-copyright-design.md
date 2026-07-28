# Footer de copyright e desenvolvedor

Data: 2026-07-28

## Objetivo

Adicionar um rodapé simples, presente tanto no app admin quanto na página pública, mostrando `Copyright (c) 2026 Aponti` e um crédito de desenvolvimento ("Desenvolvido por Leandro Carvalho") com link para o LinkedIn do autor (`https://www.linkedin.com/in/leandro-c-s/`).

## Escopo

- Aparece nos dois contextos: app admin (todas as telas internas) e página pública (`/:slug`).
- Fora de escopo: qualquer configuração para ocultar/editar o footer pela UI — é um texto fixo, sem dado no banco.

## Componente compartilhado

Novo arquivo `src/components/layout/Footer.tsx`, componente `Footer`, prop única:

```ts
type FooterProps = {
  variant: 'admin' | 'public'
}
```

Conteúdo fixo (mesmo texto/link nas duas variantes, só muda a cor), em duas linhas centralizadas:

```
Copyright (c) 2026 Aponti
Desenvolvido por Leandro Carvalho
```

- Quebra de linha (`<br />`) entre "Copyright (c) 2026 Aponti" e "Desenvolvido por Leandro Carvalho" — texto centralizado (`text-center`), não em uma única linha com separador.
- "Leandro Carvalho" é um `<a>` para `https://www.linkedin.com/in/leandro-c-s/`, com `target="_blank"` e `rel="noopener noreferrer"`.
- `variant="admin"`: texto pequeno (`text-xs`), cor `text-sidebar-foreground/70` (mesma família de cor discreta usada no restante da Sidebar), link com hover sublinhado.
- `variant="public"`: texto pequeno (`text-xs`), cor `text-white/70` (consistente com `text-white/80`/`text-white/90` já usados no restante do `PublicPagePage`), link com hover sublinhado.

## Pontos de uso

1. **`src/components/layout/Sidebar.tsx`** — dentro do `SidebarFooter` existente, como um novo item abaixo do `SidebarMenuItem` do botão "Sair" (fora do `SidebarMenu`, direto no `SidebarFooter`, já que não é um item de navegação/ação): `<Footer variant="admin" />`.
2. **`src/routes/public/PublicPagePage.tsx`** — como último elemento dentro da `div` centralizada de conteúdo (`mx-auto flex w-full max-w-sm flex-col items-center gap-6 p-6`), depois do bloco condicional do `PublicSocialIcons`: `<Footer variant="public" />`. Aparece tanto no estado "carregado com sucesso" quanto teoricamente poderia aparecer nos estados de loading/erro — **decisão**: só no estado de sucesso (loading/erro não mostram footer), para não adicionar complexidade a esses dois estados simples que já têm seu próprio layout centralizado sem essa coluna de conteúdo.

## Testes

- Teste de render para `Footer` (ambas variants) confirmando texto e `href`/`target`/`rel` do link.
- Ajuste (ou novo assert) nos testes existentes de `Sidebar.test.tsx` e/ou `PublicPagePage`-relacionados, se já existirem, para não quebrar com o novo elemento.

## Fora de escopo / não-metas

- Não há necessidade de internacionalização, tema alternativo, ou dado dinâmico (ano fixo em "2026", conforme pedido explícito do usuário).
