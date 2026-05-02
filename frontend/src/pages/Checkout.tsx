import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import type { Order } from 'floramini-types'

type Format = 'TXT' | 'JSON' | 'CSV' | 'BASE64'
type Canal  = 'BOT' | 'EMAIL'

const FORMATS: { value: Format; label: string; desc: string }[] = [
  { value: 'TXT',    label: 'TXT',    desc: 'Une ligne par champ' },
  { value: 'JSON',   label: 'JSON',   desc: 'Objet structuré' },
  { value: 'CSV',    label: 'CSV',    desc: 'Compatible Excel' },
  { value: 'BASE64', label: 'B64',    desc: 'Encodé sécurisé' },
]

export default function Checkout() {
  const navigate = useNavigate()
  const { items, note, subtotal, clear } = useCartStore()
  const [format, setFormat] = useState<Format>('TXT')
  const [canal, setCanal] = useState<Canal>('BOT')
  const [email, setEmail] = useState('')

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/cart')
  }

  useTelegramBackButton(goBack)

  const total = subtotal()

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        note: note || undefined,
        format,
        canal,
        email: canal === 'EMAIL' ? email : undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
      }
      const order: Order = await api.post('/api/orders', body).then((r) => r.data)
      await api.post(`/api/orders/${order.id}/pay`)
      return order
    },
    onSuccess: (order) => {
      clear()
      navigate(`/order/${order.id}`)
    },
  })

  const canSubmit = items.length > 0 && !mutation.isPending && (canal === 'BOT' || email.includes('@'))

  useTelegramMainButton(
    mutation.isPending ? 'TRAITEMENT...' : 'CONFIRMER LA COMMANDE',
    () => mutation.mutate(),
    canSubmit,
    '#1a1500',
    '#fbbf24',
  )

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={goBack} style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)',
          color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>←</button>
        <div>
          <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>
            CONFIRMER LA COMMANDE
          </div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>
            {items.reduce((s, i) => s + i.quantity, 0)} article{items.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''} · €{total.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Order recap */}
        <Section label="RÉCAPITULATIF">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map((item, i) => (
              <div key={item.productId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 48, height: 30, borderRadius: 5, overflow: 'hidden', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a',
                  }}>
                    {item.productImageUrl
                      ? <img src={item.productImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1c1c1e,#0d0d0d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 16, height: 12, borderRadius: 2, background: 'linear-gradient(135deg,#b8860b,#ffd700)' }} />
                        </div>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace' }}>{item.productName}</div>
                    {item.quantity > 1 && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginTop: 2 }}>× {item.quantity}</div>}
                  </div>
                </div>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, color: '#fbbf24', letterSpacing: '0.04em' }}>
                  €{(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Format de livraison */}
        <Section label="FORMAT DE LIVRAISON">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FORMATS.map((f) => (
              <button key={f.value} onClick={() => setFormat(f.value)} style={{
                borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                background: format === f.value ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${format === f.value ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.12s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, color: format === f.value ? '#fbbf24' : 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>{f.label}</span>
                  {format === f.value && <span style={{ fontSize: 8, color: '#fbbf24' }}>●</span>}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' }}>{f.desc}</div>
              </button>
            ))}
          </div>

          {/* Format preview */}
          <div style={{
            marginTop: 8, borderRadius: 8,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            padding: '10px 12px', overflow: 'hidden',
          }}>
            <div style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 6 }}>APERÇU</div>
            <pre style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {format === 'TXT'    && 'BIN: 497203\nEXPIRY: 12/26\nCVV: 412\nNOM: JEAN MARTIN\nBANQUE: CRÉDIT MUTUEL'}
              {format === 'JSON'   && '{\n  "bin": "497203",\n  "expiry": "12/26",\n  "cvv": "412",\n  "holder": "JEAN MARTIN"\n}'}
              {format === 'CSV'    && 'BIN,EXPIRY,CVV,HOLDER\n497203,12/26,412,JEAN MARTIN'}
              {format === 'BASE64' && 'QklOOiA0OTcyMDMKRVhQSVJZOiAxMi8y\nNgpDVlY6IDQxMgpOT006IEpFQU4gTUFS\nVElO...'}
            </pre>
          </div>
        </Section>

        {/* Canal de livraison */}
        <Section label="CANAL DE LIVRAISON">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* BOT option */}
            <button onClick={() => setCanal('BOT')} style={{
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
              background: canal === 'BOT' ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${canal === 'BOT' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
              transition: 'all 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: canal === 'BOT' ? '#fbbf24' : 'rgba(255,255,255,0.7)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em', marginBottom: 3 }}>
                  VIA CE BOT
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
                  Livraison instantanée dans ce chat
                </div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: `1px solid ${canal === 'BOT' ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                background: canal === 'BOT' ? 'rgba(251,191,36,0.2)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fbbf24',
              }}>
                {canal === 'BOT' && '✓'}
              </div>
            </button>

            {/* EMAIL option */}
            <button onClick={() => setCanal('EMAIL')} style={{
              borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
              background: canal === 'EMAIL' ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${canal === 'EMAIL' ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
              transition: 'all 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: canal === 'EMAIL' ? '#fbbf24' : 'rgba(255,255,255,0.7)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em', marginBottom: 3 }}>
                  PAR EMAIL
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
                  Envoi vers une adresse mail
                </div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: `1px solid ${canal === 'EMAIL' ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                background: canal === 'EMAIL' ? 'rgba(251,191,36,0.2)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fbbf24',
              }}>
                {canal === 'EMAIL' && '✓'}
              </div>
            </button>

            {/* Email input */}
            {canal === 'EMAIL' && (
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>@</span>
                <input
                  type="email" placeholder="adresse@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 12, color: '#fff', fontFamily: '"JetBrains Mono", monospace',
                    caretColor: '#fbbf24',
                  }}
                />
              </div>
            )}
          </div>
        </Section>

        {/* Note if exists */}
        {note && (
          <Section label="NOTE">
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, margin: 0 }}>{note}</p>
          </Section>
        )}

        {/* Total */}
        <div style={{
          background: '#111', borderRadius: 14,
          border: '1px solid rgba(251,191,36,0.2)',
          borderLeft: '3px solid rgba(251,191,36,0.7)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 3 }}>TOTAL</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em' }}>
              {items.reduce((s, i) => s + i.quantity, 0)} article{items.reduce((s, i) => s + i.quantity, 0) > 1 ? 's' : ''} · livraison incluse
            </div>
          </div>
          <span style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 28, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>
            €{total.toFixed(2)}
          </span>
        </div>

        {mutation.isError && (
          <div style={{ textAlign: 'center', fontSize: 10, color: '#ef4444', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em' }}>
            ERREUR — VEUILLEZ RÉESSAYER
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        input::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 10 }}>{label}</div>
      </div>
      <div style={{ padding: '0 16px 14px' }}>{children}</div>
    </div>
  )
}
