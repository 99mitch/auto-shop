import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Order } from 'floramini-types'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import OrderProgressBar from '../components/OrderProgressBar'
import StatusBadge from '../components/StatusBadge'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useTelegramBackButton(useCallback(() => navigate('/orders'), [navigate]))

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => api.get(`/api/orders/${id}`).then((r) => r.data),
    staleTime: 30 * 1000,
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <LoadingSkeleton className="h-20 rounded-2xl" />
        <LoadingSkeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          Commande #{order.id}
        </h2>
        <StatusBadge status={order.status} />
      </div>

      {/* Progress bar */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <OrderProgressBar status={order.status} />
      </div>

      {/* Items */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tg-theme-text-color)' }}>
          Articles
        </h3>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                {item.product?.name ?? `Produit #${item.productId}`} ×{item.quantity}
              </span>
              <span style={{ color: 'var(--tg-theme-text-color)' }}>
                €{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div
            className="border-t pt-2"
            style={{ borderColor: 'var(--tg-theme-hint-color, #e5e7eb)' }}
          >
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>Livraison</span>
              <span style={{ color: 'var(--tg-theme-text-color)' }}>
                €{order.deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span style={{ color: 'var(--tg-theme-text-color)' }}>Total</span>
              <span style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
                €{order.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
          Livraison
        </h3>
        <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          📅{' '}
          {new Date(order.deliverySlot).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        {order.address && (
          <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            📍 {order.address.street}, {order.address.zip} {order.address.city}
          </p>
        )}
        {order.note && (
          <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            📝 {order.note}
          </p>
        )}
      </div>
    </div>
  )
}
