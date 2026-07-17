import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('remove acentos e normaliza para minusculas', () => {
    expect(slugify('Árvore de Links Ação!')).toBe('arvore-de-links-acao')
  })

  it('colapsa espacos e caracteres invalidos em um unico hifen', () => {
    expect(slugify('  --Meu Café--  ')).toBe('meu-cafe')
  })

  it('mantem numeros', () => {
    expect(slugify('Top 10 Links 2026')).toBe('top-10-links-2026')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(slugify('')).toBe('')
  })
})
