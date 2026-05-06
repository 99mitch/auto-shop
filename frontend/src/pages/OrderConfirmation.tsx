import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Order } from 'floramini-types'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  useTelegramBackButton(() => navigate('/'))

  return <RealConfirmation id={id!} />
}

function RealConfirmation({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => api.get(`/api/orders/${id}`).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div style={{ background: '#050505', minHeight: '100vh', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[140, 80, 60].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        ))}
        <style>{`@keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
      </div>
    )
  }

  if (!order) return null

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(34,197,94,0.2)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</div>
        <div>
          <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>COMMANDE #{order.id}</div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(34,197,94,0.6)', marginTop: 2 }}>CONFIRMÉE · €{order.total.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(34,197,94,0.2)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✉</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}>LIVRAISON EN COURS</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>
              Les cartes arrivent automatiquement via le bot Telegram
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/orders')} style={{
          width: '100%', height: 44, borderRadius: 12, cursor: 'pointer',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24', fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
        }}>VOIR MES COMMANDES</button>

        <button onClick={() => navigate('/')} style={{
          width: '100%', height: 44, borderRadius: 12, cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
        }}>ACCUEIL</button>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
    </div>
  )
}
