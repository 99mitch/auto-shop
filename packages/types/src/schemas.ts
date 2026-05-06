import { z } from 'zod'

export const CreateOrderSchema = z.object({
  addressId: z.number().int().positive().optional(),
  newAddress: z
    .object({
      label: z.string().min(1),
      street: z.string().min(1),
      city: z.string().min(1),
      zip: z.string().min(1),
    })
    .optional(),
  deliverySlot: z.string().optional().default(''),
  note: z.string().optional(),
  paymentMethod: z.enum(['BALANCE', 'CRYPTO']).optional().default('BALANCE'),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        options: z.record(z.string()).optional().default({}),
      })
    )
    .min(1),
})

export const CreateAddressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
})

export const UpdateAddressSchema = CreateAddressSchema.partial()

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'DELIVERING',
    'DELIVERED',
    'CANCELLED',
  ]),
})

export const CreateProductSchema = z.object({
  categoryId: z.number().int().positive().optional().nullable(),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  imageUrl: z.string().url(),
  images: z.array(z.string().url()).optional().default([]),
  isActive: z.boolean().optional().default(true),
})

export const UpdateProductSchema = CreateProductSchema.partial()

export const UpdateSettingsSchema = z.object({
  deliveryFee: z.number().min(0).optional(),
  timeSlots: z.array(z.string()).optional(),
})

export const BulkInventorySchema = z.object({
  lines: z.array(z.string().min(13)).min(1).max(500),
})
export type BulkInventoryInput = z.infer<typeof BulkInventorySchema>

export const CreatePreOrderSchema = z.object({
  paymentMethod: z.enum(['BALANCE', 'CRYPTO']),
  quantity: z.number().int().min(1).max(100),
  pricePerCard: z.number().positive(),
  bank: z.string().optional(),
  department: z.string().max(3).optional(),
  ageRange: z.enum(['18-30', '31-45', '46-60', '61+']).optional(),
  bin: z.string().max(6).regex(/^\d{1,6}$/).optional(),
  level: z.enum(['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']).optional(),
  cardType: z.enum(['DEBIT', 'CREDIT']).optional(),
  network: z.enum(['VISA', 'MASTERCARD', 'AMEX', 'OTHER']).optional(),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type CreateAddressInput = z.infer<typeof CreateAddressSchema>
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>
export type CreatePreOrderInput = z.infer<typeof CreatePreOrderSchema>
