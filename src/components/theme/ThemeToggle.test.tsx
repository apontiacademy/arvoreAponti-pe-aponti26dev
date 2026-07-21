import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setThemeMock = vi.fn()
const useThemeMock = vi.fn(() => ({
  theme: 'system',
  setTheme: setThemeMock,
  resolvedTheme: 'light',
}))
vi.mock('next-themes', () => ({
  useTheme: () => useThemeMock(),
}))

import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    setThemeMock.mockClear()
    useThemeMock.mockReturnValue({ theme: 'system', setTheme: setThemeMock, resolvedTheme: 'light' })
  })

  it('mostra o icone de lua quando o tema resolvido e escuro', () => {
    useThemeMock.mockReturnValue({ theme: 'dark', setTheme: setThemeMock, resolvedTheme: 'dark' })
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Alternar tema' })).toBeInTheDocument()
  })

  it('permite escolher claro, escuro ou sistema pelo menu', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Alternar tema' }))
    await user.click(await screen.findByRole('menuitem', { name: /escuro/i }))
    expect(setThemeMock).toHaveBeenCalledWith('dark')

    await user.click(screen.getByRole('button', { name: 'Alternar tema' }))
    await user.click(await screen.findByRole('menuitem', { name: /claro/i }))
    expect(setThemeMock).toHaveBeenCalledWith('light')

    await user.click(screen.getByRole('button', { name: 'Alternar tema' }))
    await user.click(await screen.findByRole('menuitem', { name: /sistema/i }))
    expect(setThemeMock).toHaveBeenCalledWith('system')
  })
})
