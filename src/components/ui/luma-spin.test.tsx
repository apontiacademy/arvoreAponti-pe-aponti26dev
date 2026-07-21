import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LumaSpin } from './luma-spin'

describe('LumaSpin', () => {
  it('renderiza o indicador de carregamento', () => {
    const { container } = render(<LumaSpin />)
    expect(container.querySelector('[data-slot="luma-spin"]')).toBeInTheDocument()
  })

  it('aceita className extra', () => {
    const { container } = render(<LumaSpin className="size-8" />)
    expect(container.querySelector('[data-slot="luma-spin"]')).toHaveClass('size-8')
  })
})
