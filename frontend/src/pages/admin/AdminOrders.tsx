import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Order, OrderStatus } from 'floramini-types'

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED']

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:    { label: 'EN ATTENTE',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  CONFIRMED:  { label: 'CONFIRMÉE',    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  PREPARING:  { label: 'PRÉPARATION',  color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.25)' },
  DELIVERING: { label: 'EN LIVRAISON', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)' },
  DELIVERED:  { label: 'LIVRÉE',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)' },
  CANCELLED:  { label: 'ANNULÉE',      color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
}

function formatDate(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' · ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminOrders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders', filterStatus],
    queryFn: () => {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : ''
      return api.get(`/api/admin/orders${params}`).then(r => r.data)
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/api/admin/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setExpandedId(null)
    },
  })

  const statusFilters = [{ key: 'all', label: 'TOUT' }, ...ALL_STATUSES.map(s => ({ key: s, label: STATUS_CONFIG[s].label }))]

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/admin')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ fontFamily: '"Bebas Neue","Impact",sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>COMMANDES</div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>{orders.length} ENTRÉE{orders.length !== 1 ? 'S' : ''}</div>
        </div>
      </div>

      {/* Status filter bar */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px 0', scrollbarWidth: 'none' }}>
        {statusFilters.map(f => {
          const active = filterStatus === f.key
          const sc = f.key !== 'all' ? STATUS_CONFIG[f.key as OrderStatus] : null
          return (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 20, border: `1px solid ${active && sc ? sc.border : active ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`, background: active && sc ? sc.bg : active ? 'rgba(251,191,36,0.1)' : 'transparent', color: active && sc ? sc.color : active ? '#fbbf24' : 'rgba(255,255,255,0.25)', fontSize: 8, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
              {f.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: '#111', opacity: 0.5 }} />)
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
            AUCUNE COMMANDE
          </div>
        ) : (
          (orders as any[]).map(order => {
            const sc = STATUS_CONFIG[order.status as OrderStatus] ?? STATUS_CONFIG.PENDING
            const expanded = expandedId === order.id
            return (
              <div key={order.id} style={{ background: '#111', borderRadius: 14, border: `1px solid ${expanded ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                {/* Main row */}
                <button onClick={() => setExpandedId(expanded ? null : order.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 10 }}>
                  {/* Status indicator */}
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: sc.color, flexShrink: 0 }} />
                  {/* Order info */}
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono",monospace' }}>#{order.id}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: '"JetBrains Mono",monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.user?.firstName ?? 'Utilisateur'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.06em' }}>{sc.label}</span>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  {/* Total */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontFamily: '"Bebas Neue","Impact",sans-serif', color: '#fbbf24', letterSpacing: '0.04em' }}>€{Number(order.total).toFixed(2)}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>{order.items?.length ?? 0} article{(order.items?.length ?? 0) !== 1 ? 's' : ''}</div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginLeft: 4, transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                </button>

                {/* Expanded */}
                {expanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Items */}
                    {order.items?.length > 0 && (
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {order.items.map((item: any) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: '"JetBrains Mono",monospace' }}>{item.product?.name ?? '—'} ×{item.quantity}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace' }}>€{(item.unitPrice * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Status change */}
                    <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 8, letterSpacing: '0.15em' }}>CHANGER STATUT</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {ALL_STATUSES.filter(s => s !== order.status).map(s => {
                          const c = STATUS_CONFIG[s]
                          return (
                            <button key={s} onClick={() => updateStatus.mutate({ id: order.id, status: s })} disabled={updateStatus.isPending} style={{ padding: '5px 10px', borderRadius: 7, background: c.bg, border: `1px solid ${c.border}`, color: c.color, fontSize: 8, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                              {c.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
