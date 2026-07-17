import { z } from 'zod'

export const pageFormSchema = z.object({
  title: z.string().min(1, 'Informe um título').max(100, 'Máximo de 100 caracteres'),
  slug: z
    .string()
    .min(1, 'Informe uma URL')
    .max(60, 'Máximo de 60 caracteres')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens'),
  description: z
    .string()
    .max(280, 'Máximo de 280 caracteres')
    .optional()
    .or(z.literal('')),
})

export type PageFormValues = z.infer<typeof pageFormSchema>
