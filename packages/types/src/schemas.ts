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
  deliverySlot: z.string().min(1),
  note: z.string().optional(),
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
  categoryId: z.number().int().positive(),
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

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type CreateAddressInput = z.infer<typeof CreateAddressSchema>
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>
