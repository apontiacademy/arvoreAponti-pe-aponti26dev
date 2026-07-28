import { cn } from '@/lib/utils'

type FooterProps = {
  variant: 'admin' | 'public'
}

const VARIANT_TEXT_CLASSES: Record<FooterProps['variant'], string> = {
  admin: 'text-sidebar-foreground/70',
  public: 'text-white/70',
}

export function Footer({ variant }: FooterProps) {
  return (
    <p className={cn('px-2 py-1.5 text-center text-xs', VARIANT_TEXT_CLASSES[variant])}>
      Copyright (c) 2026 Aponti
      <br />
      Desenvolvido por{' '}
      <a
        href="https://www.linkedin.com/in/leandro-c-s/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:underline"
      >
        Leandro Carvalho
      </a>
    </p>
  )
}
