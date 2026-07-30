import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

const rememberMock = vi.fn()
const forgetMock = vi.fn()
let mockRememberedEmail: string | null = null
vi.mock('@/features/auth/useRememberedEmail', () => ({
  useRememberedEmail: () => ({
    rememberedEmail: mockRememberedEmail,
    remember: rememberMock,
    forget: forgetMock,
  }),
}))

import { supabase } from '@/lib/supabase'
import LoginPage from './LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    rememberMock.mockClear()
    forgetMock.mockClear()
    mockRememberedEmail = null
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
  })

  it('valida campos obrigatorios', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('Informe seu email')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument()
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('exibe erro quando as credenciais sao invalidas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou senha inválidos.')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('alterna a visibilidade da senha ao clicar no icone de olho', async () => {
    const user = userEvent.setup()
    renderLogin()

    const passwordInput = screen.getByLabelText('Senha')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /mostrar senha/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: /ocultar senha/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('navega para o dashboard apos login bem sucedido', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {}, user: {} },
      error: null,
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'Test1234!aponti')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /^entrar$/i })
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('pre-preenche o email e marca o checkbox quando ha email salvo', () => {
    mockRememberedEmail = 'saved@aponti.local'
    renderLogin()

    expect(screen.getByLabelText('Email')).toHaveValue('saved@aponti.local')
    expect(screen.getByRole('checkbox', { name: /lembrar meu email/i })).toBeChecked()
  })

  it('chama remember com o email apos login bem sucedido com o checkbox marcado', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {}, user: {} },
      error: null,
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'Test1234!aponti')
    await user.click(screen.getByRole('checkbox', { name: /lembrar meu email/i }))
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /^entrar$/i })
    expect(rememberMock).toHaveBeenCalledWith('dev@aponti.local')
    expect(forgetMock).not.toHaveBeenCalled()
  })

  it('chama forget apos login bem sucedido com o checkbox desmarcado', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: {}, user: {} },
      error: null,
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'Test1234!aponti')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /^entrar$/i })
    expect(forgetMock).toHaveBeenCalled()
    expect(rememberMock).not.toHaveBeenCalled()
  })

  it('nao chama remember nem forget quando as credenciais sao invalidas', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'dev@aponti.local')
    await user.type(screen.getByLabelText('Senha'), 'wrong-password')
    await user.click(screen.getByRole('checkbox', { name: /lembrar meu email/i }))
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou senha inválidos.')
    expect(rememberMock).not.toHaveBeenCalled()
    expect(forgetMock).not.toHaveBeenCalled()
  })
})
