import { z } from 'zod'

// Auth validators
export const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres')
    .max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Upload validators
export const uploadConfirmSchema = z.object({
  key: z.string().min(1),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  sizeBytes: z.number().positive().max(10 * 1024 * 1024), // 10MB max
  zone: z.enum(['FRONT', 'BACK', 'TAG']),
})

// Order validators
export const createOrderSchema = z.object({
  productVariantId: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
  uploadIds: z.record(z.enum(['FRONT', 'BACK', 'TAG']), z.string().uuid()),
  shippingAddress: z.object({
    street: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    province: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().default('AR'),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UploadConfirmInput = z.infer<typeof uploadConfirmSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
