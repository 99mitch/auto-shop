export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED'

export type UserRole = 'CUSTOMER' | 'COLLABORATOR' | 'ADMIN'

export interface User {
  id: number
  telegramId: string
  firstName: string
  lastName: string | null
  username: string | null
  photoUrl: string | null
  createdAt: string
  role: UserRole
}

export interface Address {
  id: number
  userId: number
  label: string
  street: string
  city: string
  zip: string
  isDefault: boolean
}

export interface Category {
  id: number
  slug: string
  name: string
  order: number
}

export interface Product {
  id: number
  categoryId: number
  category?: Category
  name: string
  description: string
  price: number
  stock: number
  imageUrl: string
  images: string[]
  isActive: boolean
  collaboratorId?: number | null
}

export interface CollaboratorEarning {
  id: number
  orderId: number
  orderItemId: number
  collaboratorId: number
  amount: number
  platformFee: number
  createdAt: string
}

export interface CollabStats {
  totalAmount: number
  totalPlatformFee: number
  totalSales: number
  productCount: number
  recentEarnings: CollaboratorEarning[]
  byMonth: Record<string, number>
  topProducts: { id: number; name: string; imageUrl: string; salesCount: number }[]
}

export interface CollabUser {
  id: number
  telegramId: string
  firstName: string
  lastName: string | null
  username: string | null
  photoUrl: string | null
  createdAt: string
  productCount: number
  totalEarnings: number
  totalPlatformFee: number
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  product?: Product
  quantity: number
  unitPrice: number
  options: Record<string, string>
}

export interface Order {
  id: number
  userId: number
  addressId: number | null
  address?: Address | null
  status: OrderStatus
  note: string | null
  subtotal: number
  deliveryFee: number
  total: number
  deliverySlot: string
  createdAt: string
  items?: OrderItem[]
}

export interface Favorite {
  id: number
  userId: number
  productId: number
  product?: Product
}

export interface AdminStats {
  ordersToday: number
  revenueToday: number
  lowStockProducts: Product[]
}

export interface Settings {
  deliveryFee: number
  timeSlots: string[]
}
