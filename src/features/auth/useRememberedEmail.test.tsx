import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRememberedEmail } from './useRememberedEmail'

const STORAGE_KEY = 'apontilinkcenter:remembered-email'

describe('useRememberedEmail', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna null quando nao ha email salvo', () => {
    const { result } = renderHook(() => useRememberedEmail())
    expect(result.current.rememberedEmail).toBeNull()
  })

  it('le um valor pre-existente do localStorage no mount inicial', () => {
    localStorage.setItem(STORAGE_KEY, 'saved@aponti.local')
    const { result } = renderHook(() => useRememberedEmail())
    expect(result.current.rememberedEmail).toBe('saved@aponti.local')
  })

  it('remember grava no localStorage e atualiza o estado', () => {
    const { result } = renderHook(() => useRememberedEmail())

    act(() => {
      result.current.remember('dev@aponti.local')
    })

    expect(result.current.rememberedEmail).toBe('dev@aponti.local')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dev@aponti.local')
  })

  it('forget remove do localStorage e volta o estado para null', () => {
    localStorage.setItem(STORAGE_KEY, 'dev@aponti.local')
    const { result } = renderHook(() => useRememberedEmail())

    act(() => {
      result.current.forget()
    })

    expect(result.current.rememberedEmail).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
