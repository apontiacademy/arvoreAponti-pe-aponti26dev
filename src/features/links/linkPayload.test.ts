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
