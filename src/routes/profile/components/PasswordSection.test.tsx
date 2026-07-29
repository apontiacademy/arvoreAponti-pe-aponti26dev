import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const changePasswordMutate = vi.fn()
vi.mock('@/features/profiles/useChangePassword', () => ({
  useChangePassword: () => ({ mutate: changePasswordMutate }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { PasswordSection } from './PasswordSection'

describe('PasswordSection', () => {
  it('exibe erro quando a senha tem menos de 6 caracteres', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    await user.type(screen.getByLabelText('Nova senha'), '123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), '123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    expect(await screen.findByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument()
    expect(changePasswordMutate).not.toHaveBeenCalled()
  })

  it('exibe erro quando as senhas nao coincidem', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    await user.type(screen.getByLabelText('Nova senha'), 'senha123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'outraSenha')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    expect(await screen.findByText('As senhas não coincidem')).toBeInTheDocument()
    expect(changePasswordMutate).not.toHaveBeenCalled()
  })

  it('chama a mutation com a nova senha quando o formulario e valido', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    await user.type(screen.getByLabelText('Nova senha'), 'senha123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    expect(changePasswordMutate).toHaveBeenCalledWith('senha123', expect.anything())
  })

  it('alterna mostrar/ocultar a senha', async () => {
    const user = userEvent.setup()
    render(<PasswordSection />)

    const passwordInput = screen.getByLabelText('Nova senha')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /mostrar senha/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
