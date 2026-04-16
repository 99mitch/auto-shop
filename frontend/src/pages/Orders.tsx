import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Order } from 'floramini-types'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import StatusBadge from '../components/StatusBadge'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function Orders() {
  const navigate = useNavigate()
  useTelegramBackButton(useCallback(() => navigate('/'), [navigate]))

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/api/orders').then((r) => r.data),
    staleTime: 30 * 1000,
  })

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">📦</span>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
          Aucune commande
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Vos commandes apparaîtront ici
        </p>
        <button
          onClick={() => navigate('/')}
          className="rounded-full px-6 py-2.5 text-sm font-semibold"
          style={{
            backgroundColor: 'var(--tg-theme-button-color, #3b82f6)',
            color: 'var(--tg-theme-button-text-color, #fff)',
          }}
        >
          Commencer mes achats
        </button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--tg-theme-text-color)' }}>
        Mes commandes
      </h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => navigate(`/orders/${order.id}`)}
            className="w-full flex items-center justify-between rounded-2xl p-4 text-left"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
          >
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tg-theme-text-color)' }}>
                Commande #{order.id}
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-base font-bold" style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
                €{order.total.toFixed(2)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                ›
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
