// frontend/src/pages/MesPreCommandes.tsx
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { PreOrder, PreOrderStatus } from 'floramini-types'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const STATUS_CFG: Record<PreOrderStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'EN ATTENTE', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  APPROVED:  { label: 'APPROUVÉE',  color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  REJECTED:  { label: 'REFUSÉE',    color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  FULFILLED: { label: 'COMPLÈTE',   color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)' },
}

export default function MesPreCommandes() {
  const navigate = useNavigate()

  const { data: preorders = [], isLoading } = useQuery<PreOrder[]>({
    queryKey: ['my-preorders'],
    queryFn: () => api.get('/api/preorders').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MES PRÉCOMMANDES</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2 }}>{preorders.length} au total</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => navigate('/precommande')} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: GOLD, ...MONO, fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700 }}>
            + NOUVELLE
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading ? (
          [1, 2].map((i) => <div key={i} style={{ height: 90, borderRadius: 14, background: '#111', opacity: 0.5 }} />)
        ) : preorders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>AUCUNE PRÉCOMMANDE</div>
            <button onClick={() => navigate('/precommande')} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, background: GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer' }}>
              CRÉER UNE PRÉCOMMANDE
            </button>
          </div>
        ) : (
          preorders.map((po) => {
            const sc = STATUS_CFG[po.status as PreOrderStatus] ?? STATUS_CFG.PENDING
            const tags = [po.network, po.level, po.cardType, po.bank].filter(Boolean)
            const progress = po.quantity > 0 ? po.fulfilled / po.quantity : 0
            return (
              <div key={po.id} style={{ background: '#111', borderRadius: 14, border: `1px solid ${sc.border}`, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>#{po.id}</span>
                    <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, ...MONO, fontWeight: 700, letterSpacing: '0.06em' }}>{sc.label}</span>
                  </div>
                  <span style={{ ...BEBAS, fontSize: 18, color: GOLD }}>€{po.total.toFixed(2)}</span>
                </div>

                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {tags.map((t) => (
                      <span key={t} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', ...MONO }}>{t}</span>
                    ))}
                    {po.department && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', ...MONO }}>DEPT {po.department}</span>}
                    {po.ageRange && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', ...MONO }}>{po.ageRange} ANS</span>}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>LIVRAISON</span>
                    <span style={{ ...MONO, fontSize: 8, color: sc.color }}>{po.fulfilled} / {po.quantity}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: 3, borderRadius: 2, background: sc.color, width: `${progress * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{new Date(po.createdAt).toLocaleDateString('fr-FR')}</span>
                  <span style={{ ...MONO, fontSize: 8, color: po.paymentMethod === 'BALANCE' ? '#4ade80' : '#818cf8' }}>{po.paymentMethod === 'BALANCE' ? '💳 SOLDE' : '🔗 CRYPTO'}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
