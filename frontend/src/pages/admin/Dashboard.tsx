import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { AdminStats } from 'floramini-types'
import LoadingSkeleton from '../../components/LoadingSkeleton'

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then((r) => r.data),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          🌸 Admin FloraMini
        </h1>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Commandes', path: '/admin/orders', icon: '📦' },
          { label: 'Produits', path: '/admin/products', icon: '🌹' },
          { label: 'Réglages', path: '/admin/settings', icon: '⚙️' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center rounded-2xl p-3"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--tg-theme-text-color)' }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <LoadingSkeleton className="h-24 rounded-2xl" />
          <LoadingSkeleton className="h-24 rounded-2xl" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                Commandes aujourd&apos;hui
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
                {stats.ordersToday}
              </p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                Chiffre d&apos;affaires
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
                €{stats.revenueToday.toFixed(2)}
              </p>
            </div>
          </div>

          {stats.lowStockProducts.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
            >
              <h3 className="text-sm font-semibold mb-3 text-orange-500">
                ⚠️ Stock faible ({stats.lowStockProducts.length})
              </h3>
              <div className="space-y-2">
                {stats.lowStockProducts.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--tg-theme-text-color)' }}>{p.name}</span>
                    <span className="font-bold text-orange-500">{p.stock} restant{p.stock > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
