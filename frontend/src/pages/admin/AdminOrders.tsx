import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Order, OrderStatus } from 'floramini-types'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'
import StatusBadge from '../../components/StatusBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED']

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  DELIVERING: 'En livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
}

export default function AdminOrders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/admin'), [navigate]))

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders', filterStatus],
    queryFn: () => {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
      return api.get(`/api/admin/orders${params}`).then((r) => r.data)
    },
    staleTime: 30 * 1000,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/api/admin/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setEditingOrderId(null)
    },
  })

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--tg-theme-text-color)' }}>
        Gestion des commandes
      </h2>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {['all', ...ALL_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
            style={
              filterStatus === s
                ? { backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }
                : { backgroundColor: 'var(--tg-theme-secondary-bg-color, #f3f4f6)', color: 'var(--tg-theme-text-color)' }
            }
          >
            {s === 'all' ? 'Toutes' : STATUS_LABELS[s as OrderStatus]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">📭</span>
          <p className="text-sm mt-2" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>Aucune commande</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
                    #{order.id} — {order.user?.firstName} {order.user?.lastName ?? ''}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                    {new Date(order.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <p className="font-bold text-sm" style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
                  €{order.total.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge status={order.status} />
                <button
                  onClick={() => setEditingOrderId(editingOrderId === order.id ? null : order.id)}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}
                >
                  Modifier
                </button>
              </div>

              {editingOrderId === order.id && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--tg-theme-hint-color, #e5e7eb)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                    Nouveau statut :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.filter((s) => s !== order.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus.mutate({ id: order.id, status: s })}
                        disabled={updateStatus.isPending}
                        className="text-xs px-3 py-1.5 rounded-full border"
                        style={{ borderColor: 'var(--tg-theme-hint-color, #e5e7eb)', color: 'var(--tg-theme-text-color)' }}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
