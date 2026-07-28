import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'

describe('Footer', () => {
  it('exibe o texto de copyright', () => {
    render(<Footer variant="admin" />)
    expect(screen.getByText(/copyright \(c\) 2026 aponti/i)).toBeInTheDocument()
  })

  it('linka o nome do desenvolvedor para o linkedin, abrindo em nova aba', () => {
    render(<Footer variant="admin" />)
    const link = screen.getByRole('link', { name: /leandro carvalho/i })
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/leandro-c-s/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('usa a cor de texto da variant admin', () => {
    render(<Footer variant="admin" />)
    expect(screen.getByText(/copyright/i)).toHaveClass('text-sidebar-foreground/70')
  })

  it('usa a cor de texto da variant public', () => {
    render(<Footer variant="public" />)
    expect(screen.getByText(/copyright/i)).toHaveClass('text-white/70')
  })

  it('quebra a linha entre o copyright e o credito de desenvolvimento, centralizado', () => {
    render(<Footer variant="admin" />)
    const paragraph = screen.getByText(/copyright/i)
    expect(paragraph).toHaveClass('text-center')
    expect(paragraph.querySelector('br')).toBeInTheDocument()
  })
})
