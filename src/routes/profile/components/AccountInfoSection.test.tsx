import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountInfoSection } from './AccountInfoSection'

const baseProfile = {
  id: 'user-1',
  username: 'leandro',
  display_name: 'Leandro Carvalho',
  bio: null,
  avatar_url: null,
  created_at: '2026-01-15T12:00:00.000Z',
}

describe('AccountInfoSection', () => {
  it('exibe o nome de usuario, o email, o papel admin e a data de criacao', () => {
    render(
      <AccountInfoSection email="leandro@aponti.org.br" profile={{ ...baseProfile, role: 'admin' }} />,
    )

    expect(screen.getByText('leandro')).toBeInTheDocument()
    expect(screen.getByText('leandro@aponti.org.br')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('15/01/2026')).toBeInTheDocument()
  })

  it('exibe o papel basico para usuarios nao-admin', () => {
    render(
      <AccountInfoSection email="leandro@aponti.org.br" profile={{ ...baseProfile, role: 'user' }} />,
    )

    expect(screen.getByText('Básico')).toBeInTheDocument()
  })
})
