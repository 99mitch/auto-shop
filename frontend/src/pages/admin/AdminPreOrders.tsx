// frontend/src/pages/admin/AdminPreOrders.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { PreOrder, PreOrderStatus } from 'floramini-types'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const STATUS_CFG: Record<PreOrderStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'EN ATTENTE', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  APPROVED:  { label: 'APPROUVÉE',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)' },
  REJECTED:  { label: 'REFUSÉE',    color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  FULFILLED: { label: 'COMPLÈTE',   color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)' },
}

type AdminPreOrder = Omit<PreOrder, "user"> & {
  user?: { id: number; firstName: string; username: string | null }
}

export default function AdminPreOrders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: preorders = [], isLoading } = useQuery<AdminPreOrder[]>({
    queryKey: ['admin-preorders', filterStatus],
    queryFn: () => api.get(`/api/admin/preorders?status=${filterStatus}`).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'APPROVE' | 'REJECT' }) =>
      api.patch(`/api/admin/preorders/${id}`, { action }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-preorders'] })
      setExpandedId(null)
    },
  })

  const filters: PreOrderStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/admin')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>PRÉCOMMANDES</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>{preorders.length} ENTRÉE{preorders.length !== 1 ? 'S' : ''}</div>
        </div>
      </div>

      <div style={{ flexShrink: 0, display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px 0', scrollbarWidth: 'none' }}>
        {filters.map((f) => {
          const active = filterStatus === f
          const sc = STATUS_CFG[f]
          return (
            <button key={f} onClick={() => setFilterStatus(f)} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? sc.border : 'rgba(255,255,255,0.08)'}`, background: active ? sc.bg : 'transparent', color: active ? sc.color : 'rgba(255,255,255,0.25)', fontSize: 8, ...MONO, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
              {sc.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading ? (
          [1, 2].map((i) => <div key={i} style={{ height: 80, borderRadius: 14, background: '#111', opacity: 0.5 }} />)
        ) : preorders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            AUCUNE PRÉCOMMANDE {filterStatus}
          </div>
        ) : (
          preorders.map((po) => {
            const sc = STATUS_CFG[po.status as PreOrderStatus] ?? STATUS_CFG.PENDING
            const expanded = expandedId === po.id
            const tags = [po.network, po.level, po.cardType, po.bank, po.department && `DEPT ${po.department}`, po.ageRange && `${po.ageRange} ANS`].filter(Boolean) as string[]
            return (
              <div key={po.id} style={{ background: '#111', borderRadius: 14, border: `1px solid ${expanded ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                <button onClick={() => setExpandedId(expanded ? null : po.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: sc.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>#{po.id}</span>
                      <span style={{ ...MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.user?.firstName ?? '—'}</span>
                      {po.user?.username && <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>@{po.user.username}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, ...MONO, fontWeight: 700 }}>{sc.label}</span>
                      <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{po.quantity} cartes × €{po.pricePerCard}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ ...BEBAS, fontSize: 18, color: GOLD }}>€{po.total.toFixed(2)}</div>
                    <div style={{ ...MONO, fontSize: 8, color: po.paymentMethod === 'BALANCE' ? '#4ade80' : '#818cf8' }}>{po.paymentMethod}</div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginLeft: 4, transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                </button>

                {expanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {tags.map((t) => (
                        <span key={t} style={{ fontSize: 8, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', ...MONO }}>{t}</span>
                      ))}
                      {po.bin && <span style={{ fontSize: 8, padding: '3px 8px', borderRadius: 5, background: 'rgba(251,191,36,0.08)', color: '#fbbf24', ...MONO }}>BIN {po.bin}</span>}
                    </div>

                    <div style={{ padding: '0 14px 10px' }}>
                      <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{po.fulfilled}/{po.quantity} CARTES LIVRÉES</div>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: 3, borderRadius: 2, background: sc.color, width: `${po.quantity > 0 ? (po.fulfilled / po.quantity) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {po.status === 'PENDING' && (
                      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => actionMutation.mutate({ id: po.id, action: 'APPROVE' })}
                          disabled={actionMutation.isPending}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', ...MONO, fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
                        >
                          ✅ APPROUVER
                        </button>
                        <button
                          onClick={() => actionMutation.mutate({ id: po.id, action: 'REJECT' })}
                          disabled={actionMutation.isPending}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', ...MONO, fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
                        >
                          ❌ REJETER
                        </button>
                      </div>
                    )}
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
