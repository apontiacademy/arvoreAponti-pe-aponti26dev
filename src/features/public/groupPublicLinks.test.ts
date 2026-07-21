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
