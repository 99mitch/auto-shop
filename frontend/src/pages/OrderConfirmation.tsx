import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Order } from 'floramini-types'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => api.get(`/api/orders/${id}`).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSkeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="text-6xl mb-4">✅</span>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
        Commande confirmée !
      </h1>
      <p className="text-sm mb-1" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
        Commande #{order.id}
      </p>
      <p className="text-xl font-bold mb-6" style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
        Total : €{order.total.toFixed(2)}
      </p>

      <div
        className="w-full rounded-2xl p-4 mb-6 text-left"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tg-theme-text-color)' }}>
          Livraison prévue
        </p>
        <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          {new Date(order.deliverySlot).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      <button
        onClick={() => navigate('/orders')}
        className="rounded-full px-8 py-3 text-sm font-semibold"
        style={{
          backgroundColor: 'var(--tg-theme-button-color, #3b82f6)',
          color: 'var(--tg-theme-button-text-color, #fff)',
        }}
      >
        Voir mes commandes
      </button>
    </div>
  )
}
