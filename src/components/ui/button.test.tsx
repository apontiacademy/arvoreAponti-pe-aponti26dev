import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Button } from './button'

describe('Button', () => {
  it('renders and is accessible via its accessible name', () => {
    render(<Button>Click me</Button>)

    expect(
      screen.getByRole('button', { name: /click me/i })
    ).toBeInTheDocument()
  })
})
