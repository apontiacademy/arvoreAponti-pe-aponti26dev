import { describe, it, expect } from 'vitest'
import { resolveLinkHref, isCopyOnlyLink } from './resolveLinkHref'
import type { Link } from '@/features/links/useLinks'

function makeLink(overrides: Partial<Link>): Link {
  return {
    id: 'link-1',
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

describe('resolveLinkHref', () => {
  it('retorna null quando nao ha url', () => {
    expect(resolveLinkHref(makeLink({ type: 'link', url: null }))).toBeNull()
  })

  it('monta wa.me a partir dos digitos do numero', () => {
    expect(resolveLinkHref(makeLink({ type: 'whatsapp', url: '+55 (11) 99999-9999' }))).toBe(
      'https://wa.me/5511999999999',
    )
  })

  it('monta mailto para email', () => {
    expect(resolveLinkHref(makeLink({ type: 'email', url: 'a@b.com' }))).toBe('mailto:a@b.com')
  })

  it('monta tel para telefone', () => {
    expect(resolveLinkHref(makeLink({ type: 'phone', url: '+5511999999999' }))).toBe(
      'tel:+5511999999999',
    )
  })

  it('monta URL de perfil do instagram a partir de um handle', () => {
    expect(resolveLinkHref(makeLink({ type: 'instagram', url: '@minhaloja' }))).toBe(
      'https://instagram.com/minhaloja',
    )
  })

  it('mantem a URL completa se ja for um link', () => {
    expect(
      resolveLinkHref(makeLink({ type: 'instagram', url: 'https://instagram.com/minhaloja' })),
    ).toBe('https://instagram.com/minhaloja')
  })

  it('retorna null para title, text e pix', () => {
    expect(resolveLinkHref(makeLink({ type: 'title', url: 'algo' }))).toBeNull()
    expect(resolveLinkHref(makeLink({ type: 'text', url: 'algo' }))).toBeNull()
    expect(resolveLinkHref(makeLink({ type: 'pix', url: 'chave@pix.com' }))).toBeNull()
  })

  it('usa a url diretamente para tipos genericos (link, youtube, spotify, image, video)', () => {
    expect(resolveLinkHref(makeLink({ type: 'link', url: 'https://exemplo.com' }))).toBe(
      'https://exemplo.com',
    )
  })
})

describe('isCopyOnlyLink', () => {
  it('e verdadeiro apenas para pix', () => {
    expect(isCopyOnlyLink('pix')).toBe(true)
    expect(isCopyOnlyLink('link')).toBe(false)
  })
})
