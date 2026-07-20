import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const usePageMock = vi.fn()
vi.mock('@/features/pages/usePage', () => ({
  usePage: (id: string | undefined) => usePageMock(id),
}))

import { Breadcrumb } from './Breadcrumb'

function renderAt(path: string) {
  usePageMock.mockReturnValue({ data: undefined })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard" element={<Breadcrumb />} />
        <Route path="/pages" element={<Breadcrumb />} />
        <Route path="/pages/new" element={<Breadcrumb />} />
        <Route path="/pages/:id/edit" element={<Breadcrumb />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Breadcrumb', () => {
  it('mostra um unico item para uma rota de nivel raiz', () => {
    renderAt('/dashboard')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('mostra o caminho completo para uma rota aninhada estatica', () => {
    renderAt('/pages/new')
    expect(screen.getByRole('link', { name: 'Árvores' })).toHaveAttribute('href', '/pages')
    expect(screen.getByText('Nova árvore')).toBeInTheDocument()
  })

  it('usa o titulo da pagina no lugar do id na rota de edicao', () => {
    usePageMock.mockReturnValue({ data: { title: 'Minha Loja' } })
    render(
      <MemoryRouter initialEntries={['/pages/page-1/edit']}>
        <Routes>
          <Route path="/pages/:id/edit" element={<Breadcrumb />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Árvores' })).toHaveAttribute('href', '/pages')
    expect(screen.getByText('Minha Loja')).toBeInTheDocument()
    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.queryByText('page-1')).not.toBeInTheDocument()
  })
})
