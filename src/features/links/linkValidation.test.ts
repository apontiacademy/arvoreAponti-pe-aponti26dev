import { describe, it, expect } from 'vitest'
import { validateUrlField, validateLabelField } from './linkValidation'

describe('validateUrlField', () => {
  it('nao exige valor para title/text (nao tem campo de url)', () => {
    expect(validateUrlField('title', '')).toBeNull()
    expect(validateUrlField('text', '')).toBeNull()
  })

  it('exige uma URL valida para tipos baseados em URL', () => {
    for (const type of ['link', 'youtube', 'spotify', 'image', 'video'] as const) {
      expect(validateUrlField(type, '')).toMatch(/Informe uma URL/)
      expect(validateUrlField(type, 'nao-e-uma-url')).toMatch(/URL válida/)
      expect(validateUrlField(type, 'https://exemplo.com')).toBeNull()
    }
  })

  it('exige um email valido para o tipo email', () => {
    expect(validateUrlField('email', '')).toMatch(/Informe um email/)
    expect(validateUrlField('email', 'nao-e-email')).toMatch(/email válido/)
    expect(validateUrlField('email', 'contato@exemplo.com')).toBeNull()
  })

  it('exige numeros suficientes para whatsapp/phone', () => {
    expect(validateUrlField('whatsapp', '')).toMatch(/Informe um número/)
    expect(validateUrlField('whatsapp', '123')).toMatch(/número válido/)
    expect(validateUrlField('whatsapp', '5511999999999')).toBeNull()
    expect(validateUrlField('phone', '+55 11 99999-9999')).toBeNull()
  })

  it('aceita usuario ou link para instagram/tiktok/telegram, apenas exige nao vazio', () => {
    for (const type of ['instagram', 'tiktok', 'telegram'] as const) {
      expect(validateUrlField(type, '')).toMatch(/usuário ou link/)
      expect(validateUrlField(type, '@meuusuario')).toBeNull()
      expect(validateUrlField(type, 'https://instagram.com/meuusuario')).toBeNull()
    }
  })

  it('exige apenas valor nao vazio para pix', () => {
    expect(validateUrlField('pix', '')).toMatch(/chave Pix/)
    expect(validateUrlField('pix', 'chave-aleatoria')).toBeNull()
  })
})

describe('validateLabelField', () => {
  it('exige texto nao vazio para title e text', () => {
    expect(validateLabelField('title', '')).toMatch(/Informe um título/)
    expect(validateLabelField('title', 'Bem-vindo')).toBeNull()
    expect(validateLabelField('text', '')).toMatch(/Informe um texto/)
    expect(validateLabelField('text', 'Alguma descrição')).toBeNull()
  })

  it('nao exige label para os demais tipos (campo opcional)', () => {
    expect(validateLabelField('link', '')).toBeNull()
    expect(validateLabelField('whatsapp', '')).toBeNull()
  })
})
