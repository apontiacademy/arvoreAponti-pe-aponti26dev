import {
  AlignLeft,
  Camera,
  Disc3,
  Heading,
  Image,
  Link2,
  Mail,
  MessageCircle,
  Music,
  Phone,
  PlayCircle,
  QrCode,
  Send,
  Video,
  type LucideIcon,
} from 'lucide-react'

export type LinkType =
  | 'title'
  | 'text'
  | 'link'
  | 'whatsapp'
  | 'instagram'
  | 'tiktok'
  | 'telegram'
  | 'youtube'
  | 'spotify'
  | 'pix'
  | 'email'
  | 'phone'
  | 'image'
  | 'video'

export interface LinkTypeConfig {
  type: LinkType
  label: string
  icon: LucideIcon
  hasUrl: boolean
  valueLabel?: string
  valuePlaceholder?: string
}

export const LINK_TYPES: LinkTypeConfig[] = [
  { type: 'title', label: 'Título', icon: Heading, hasUrl: false },
  { type: 'text', label: 'Texto', icon: AlignLeft, hasUrl: false },
  {
    type: 'link',
    label: 'Link',
    icon: Link2,
    hasUrl: true,
    valueLabel: 'URL',
    valuePlaceholder: 'https://...',
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    hasUrl: true,
    valueLabel: 'Número (com DDI)',
    valuePlaceholder: '5511999999999',
  },
  {
    type: 'instagram',
    label: 'Instagram',
    icon: Camera,
    hasUrl: true,
    valueLabel: 'Usuário ou link',
    valuePlaceholder: '@seuusuario',
  },
  {
    type: 'tiktok',
    label: 'TikTok',
    icon: Disc3,
    hasUrl: true,
    valueLabel: 'Usuário ou link',
    valuePlaceholder: '@seuusuario',
  },
  {
    type: 'telegram',
    label: 'Telegram',
    icon: Send,
    hasUrl: true,
    valueLabel: 'Usuário ou link',
    valuePlaceholder: '@seuusuario',
  },
  {
    type: 'youtube',
    label: 'YouTube',
    icon: PlayCircle,
    hasUrl: true,
    valueLabel: 'URL do canal ou vídeo',
    valuePlaceholder: 'https://youtube.com/...',
  },
  {
    type: 'spotify',
    label: 'Spotify',
    icon: Music,
    hasUrl: true,
    valueLabel: 'URL do perfil ou faixa',
    valuePlaceholder: 'https://open.spotify.com/...',
  },
  {
    type: 'pix',
    label: 'Pix',
    icon: QrCode,
    hasUrl: true,
    valueLabel: 'Chave Pix',
    valuePlaceholder: 'email, telefone, CPF ou chave aleatória',
  },
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    hasUrl: true,
    valueLabel: 'Email',
    valuePlaceholder: 'nome@dominio.com',
  },
  {
    type: 'phone',
    label: 'Telefone',
    icon: Phone,
    hasUrl: true,
    valueLabel: 'Telefone',
    valuePlaceholder: '+55 11 99999-9999',
  },
  {
    type: 'image',
    label: 'Imagem',
    icon: Image,
    hasUrl: true,
    valueLabel: 'URL da imagem',
    valuePlaceholder: 'https://...',
  },
  {
    type: 'video',
    label: 'Vídeo',
    icon: Video,
    hasUrl: true,
    valueLabel: 'URL do vídeo',
    valuePlaceholder: 'https://...',
  },
]

export const LINK_TYPE_MAP: Record<LinkType, LinkTypeConfig> = Object.fromEntries(
  LINK_TYPES.map((config) => [config.type, config]),
) as Record<LinkType, LinkTypeConfig>
