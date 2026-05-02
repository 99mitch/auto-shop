import { useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Order } from 'floramini-types'
import type { MockOrderState, DeliveryItem } from './Checkout'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

const FORMAT_LANG: Record<string, string> = { TXT: 'text', JSON: 'json', CSV: 'csv', BASE64: 'text' }

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const mockState = location.state as MockOrderState | null

  useTelegramBackButton(() => navigate('/'))

  if (mockState?.mock) {
    return <MockConfirmation state={mockState} />
  }

  return <RealConfirmation id={id!} />
}

/* ─── Mock confirmation ─────────────────────────────────────── */

function MockConfirmation({ state }: { state: MockOrderState }) {
  const navigate = useNavigate()
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  const copyAll = () => {
    const all = state.deliveries.map((d, i) => `=== CARTE ${i + 1} ===\n${d.payload}`).join('\n\n')
    navigator.clipboard.writeText(all).then(() => {
      setCopiedIdx(-1)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(34,197,94,0.2)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>✓</div>
        <div>
          <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>
            COMMANDE CONFIRMÉE
          </div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(34,197,94,0.6)', marginTop: 2, letterSpacing: '0.1em' }}>
            {state.deliveries.length} carte{state.deliveries.length > 1 ? 's' : ''} · {state.format} · {state.canal === 'BOT' ? 'VIA BOT' : state.email} · €{state.total.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Card selector tabs (if multiple) */}
        {state.deliveries.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="scrollbar-hide">
            {state.deliveries.map((d, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
                background: activeIdx === i ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeIdx === i ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: activeIdx === i ? '#4ade80' : 'rgba(255,255,255,0.35)',
              }}>CARTE {i + 1}</button>
            ))}
          </div>
        )}

        <DeliveryCard
          item={state.deliveries[activeIdx]}
          index={activeIdx}
          format={state.format}
          copied={copiedIdx === activeIdx}
          onCopy={() => copy(state.deliveries[activeIdx].payload, activeIdx)}
        />

        {/* Copy all */}
        {state.deliveries.length > 1 && (
          <button onClick={copyAll} style={{
            width: '100%', padding: '10px', borderRadius: 11, cursor: 'pointer',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
            color: copiedIdx === -1 ? '#4ade80' : 'rgba(255,255,255,0.4)',
          }}>
            {copiedIdx === -1 ? '✓ TOUT COPIÉ' : `COPIER TOUT (${state.deliveries.length} CARTES)`}
          </button>
        )}

        {/* Canal info */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '12px 15px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 8 }}>LIVRAISON</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
              {state.canal === 'BOT' ? '✉' : '@'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}>
                {state.canal === 'BOT' ? 'Envoyé dans ce chat' : state.email}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>
                Format {state.format} · {state.deliveries.length} fichier{state.deliveries.length > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 9, color: '#4ade80', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>LIVRÉ</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')} style={{
            flex: 1, height: 42, borderRadius: 11, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700,
            fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
          }}>ACCUEIL</button>
          <button onClick={() => navigate('/catalogue?type=cards')} style={{
            flex: 2, height: 42, borderRadius: 11, cursor: 'pointer',
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24', fontSize: 11, fontWeight: 700,
            fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
          }}>CONTINUER LES ACHATS</button>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

function DeliveryCard({ item, index, format, copied, onCopy }: {
  item: DeliveryItem; index: number; format: string; copied: boolean; onCopy: () => void
}) {
  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(34,197,94,0.2)', borderLeft: '3px solid rgba(34,197,94,0.5)', overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 46, height: 29, borderRadius: 5, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a' }}>
          {item.productImageUrl
            ? <img src={item.productImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1c1c1e,#0d0d0d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 16, height: 11, borderRadius: 2, background: 'linear-gradient(135deg,#b8860b,#ffd700)' }} />
              </div>
          }
        </div>
        <div style={{ flex: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>
          {item.productName}
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(34,197,94,0.7)', fontFamily: '"JetBrains Mono", monospace', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: 4 }}>
          {format}
        </span>
      </div>

      {/* Payload */}
      <div style={{ padding: '10px 14px', position: 'relative' }}>
        <pre style={{
          margin: 0, fontSize: format === 'BASE64' ? 8 : 10,
          color: format === 'JSON' ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.7)',
          fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.65,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          background: 'rgba(0,0,0,0.3)', borderRadius: 8,
          padding: '10px 12px',
        }}>
          {/* Syntax-highlight JSON keys */}
          {format === 'JSON'
            ? item.payload.split('\n').map((line, li) => (
                <span key={li}>
                  {line.replace(/"(\w+)":/g, (_, k) => `"${k}":`)
                    .split(/"(\w+)":/).map((part, pi) =>
                      pi % 2 === 1
                        ? <span key={pi} style={{ color: '#7dd3fc' }}>"{part}"</span>
                        : <span key={pi}>{part}</span>
                    )}
                  {'\n'}
                </span>
              ))
            : item.payload
          }
        </pre>

        {/* Copy button */}
        <button onClick={onCopy} style={{
          position: 'absolute', top: 18, right: 22,
          padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: copied ? '#4ade80' : 'rgba(255,255,255,0.4)',
          fontSize: 9, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
          transition: 'all 0.15s',
        }}>
          {copied ? '✓ COPIÉ' : 'COPIER'}
        </button>
      </div>
    </div>
  )
}

/* ─── Real order confirmation ───────────────────────────────── */

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
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
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
      <div style={{ padding: '16px' }}>
        <button onClick={() => navigate('/orders')} style={{
          width: '100%', height: 44, borderRadius: 12, cursor: 'pointer',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24', fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
        }}>VOIR MES COMMANDES</button>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
    </div>
  )
}
