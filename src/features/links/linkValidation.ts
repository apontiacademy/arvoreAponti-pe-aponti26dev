import { z } from 'zod'
import type { LinkType } from './linkTypes'

const urlSchema = z
  .string()
  .trim()
  .min(1, 'Informe uma URL.')
  .url('Informe uma URL válida (ex: https://...).')

const requiredText = (message: string) => z.string().trim().min(1, message)

const emailSchema = z.string().trim().min(1, 'Informe um email.').email('Informe um email válido.')

const phoneLikeSchema = z
  .string()
  .trim()
  .min(1, 'Informe um número.')
  .refine((value) => (value.match(/\d/g)?.length ?? 0) >= 8, {
    message: 'Informe um número válido, com DDI e DDD.',
  })

function getUrlFieldSchema(type: LinkType): z.ZodTypeAny | null {
  switch (type) {
    case 'title':
    case 'text':
      return null
    case 'email':
      return emailSchema
    case 'whatsapp':
    case 'phone':
      return phoneLikeSchema
    case 'link':
    case 'youtube':
    case 'spotify':
    case 'image':
    case 'video':
      return urlSchema
    case 'instagram':
    case 'tiktok':
    case 'telegram':
      return requiredText('Informe um usuário ou link.')
    case 'pix':
      return requiredText('Informe a chave Pix.')
    default:
      return null
  }
}

function getLabelFieldSchema(type: LinkType): z.ZodTypeAny | null {
  if (type === 'title') return requiredText('Informe um título.')
  if (type === 'text') return requiredText('Informe um texto.')
  return null
}

function firstIssueMessage(schema: z.ZodTypeAny, value: string): string | null {
  const result = schema.safeParse(value)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Valor inválido.'
}

export function validateUrlField(type: LinkType, value: string): string | null {
  const schema = getUrlFieldSchema(type)
  if (!schema) return null
  return firstIssueMessage(schema, value)
}

export function validateLabelField(type: LinkType, value: string): string | null {
  const schema = getLabelFieldSchema(type)
  if (!schema) return null
  return firstIssueMessage(schema, value)
}
