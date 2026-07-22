import { describe, it, expect } from 'vitest'
import { getDescriptionAlign, withDescriptionAlign } from './pageSettings'

describe('getDescriptionAlign', () => {
  it('retorna center quando o settings esta vazio', () => {
    expect(getDescriptionAlign({})).toBe('center')
  })

  it('retorna center para settings nulo, array ou nao-objeto', () => {
    expect(getDescriptionAlign(null)).toBe('center')
    expect(getDescriptionAlign([])).toBe('center')
    expect(getDescriptionAlign('texto')).toBe('center')
  })

  it('retorna left quando descriptionAlign e left', () => {
    expect(getDescriptionAlign({ descriptionAlign: 'left' })).toBe('left')
  })

  it('retorna center quando descriptionAlign e um valor invalido', () => {
    expect(getDescriptionAlign({ descriptionAlign: 'right' })).toBe('center')
  })
})

describe('withDescriptionAlign', () => {
  it('adiciona descriptionAlign a um settings vazio', () => {
    expect(withDescriptionAlign({}, 'left')).toEqual({ descriptionAlign: 'left' })
  })

  it('preserva outras chaves do settings existente', () => {
    expect(withDescriptionAlign({ outraChave: 'valor' }, 'left')).toEqual({
      outraChave: 'valor',
      descriptionAlign: 'left',
    })
  })

  it('trata settings nulo ou invalido como objeto vazio', () => {
    expect(withDescriptionAlign(null, 'center')).toEqual({ descriptionAlign: 'center' })
    expect(withDescriptionAlign([], 'left')).toEqual({ descriptionAlign: 'left' })
  })
})
