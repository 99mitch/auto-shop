import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import type { Order } from 'floramini-types'
import { MOCK_CARDS } from './Catalogue'

export type Format = 'TXT' | 'JSON' | 'CSV' | 'MESSAGE'

export interface DeliveryItem {
  productName: string
  productImageUrl: string
  payload: string
}

export interface MockOrderState {
  mock: true
  format: Format
  total: number
  deliveries: DeliveryItem[]
}

const FORMATS: { value: Format; label: string; desc: string }[] = [
  { value: 'MESSAGE', label: 'MSG',  desc: 'Message Telegram' },
  { value: 'TXT',     label: 'TXT',  desc: 'Fichier texte' },
  { value: 'JSON',    label: 'JSON', desc: 'Fichier structuré' },
  { value: 'CSV',     label: 'CSV',  desc: 'Fichier Excel' },
]

const FIRST_NAMES = ['Jean', 'Marie', 'Pierre', 'Sophie', 'François', 'Claire', 'Michel', 'Isabelle', 'Philippe', 'Nathalie', 'Antoine', 'Julie']
const LAST_NAMES  = ['MARTIN', 'BERNARD', 'THOMAS', 'PETIT', 'ROBERT', 'RICHARD', 'DURAND', 'DUBOIS', 'MOREAU', 'LAURENT', 'SIMON', 'MICHEL']

function genCardPayload(id: number, format: Format): string {
  const mc = MOCK_CARDS.find((c) => c.id === id)
  if (!mc) return ''

  const suffix = String(id * 13579 + 2468013579).slice(0, 10)
  const numero = mc.bin + suffix
  const month  = String((id * 7 % 12) + 1).padStart(2, '0')
  const expiry = `${month}/${26 + (id % 3)}`
  const cvv    = String(100 + (id * 137) % 900)
  const nom    = `${FIRST_NAMES[id % FIRST_NAMES.length]} ${LAST_NAMES[(id * 3) % LAST_NAMES.length]}`
  const phone  = mc.tags.includes('IPHONE') ? 'IPHONE' : mc.tags.includes('ANDROID') ? 'ANDROID' : '—'
  const ameli  = mc.tags.includes('AMELI') ? 'OUI' : 'NON'
  const type   = mc.tags.includes('CREDIT') ? 'CREDIT' : 'DEBIT'

  const fields = {
    BIN: mc.bin, NUMERO: numero, EXPIRY: expiry, CVV: cvv,
    NOM: nom, BANQUE: mc.banque, NIVEAU: mc.niveau,
    TYPE: type, CODE_POSTAL: mc.cp, AGE: String(mc.age),
    TELEPHONE: phone, AMELI: ameli,
  }

  if (format === 'TXT') {
    return Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')
  }
  if (format === 'JSON') {
    const obj: Record<string, unknown> = {
      bin: fields.BIN, numero: fields.NUMERO, expiry: fields.EXPIRY, cvv: fields.CVV,
      nom: fields.NOM, banque: fields.BANQUE, niveau: fields.NIVEAU, type: fields.TYPE,
      cp: fields.CODE_POSTAL, age: mc.age, telephone: fields.TELEPHONE, ameli: fields.AMELI === 'OUI',
    }
    return JSON.stringify(obj, null, 2)
  }
  if (format === 'CSV') {
    const keys = Object.keys(fields).join(',')
    const vals = Object.values(fields).join(',')
    return `${keys}\n${vals}`
  }
  if (format === 'MESSAGE') {
    return Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')
  }
  return ''
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, note, subtotal, clear } = useCartStore()
  const [format, setFormat] = useState<Format>('MESSAGE')

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/cart')
  }

  useTelegramBackButton(goBack)

  const total = subtotal()
  const isMock = items.every((i) => i.productId >= 1 && i.productId <= 12)

  const mutation = useMutation({
    mutationFn: async () => {
      if (isMock) {
        const deliveries: DeliveryItem[] = items.flatMap((item) =>
          Array.from({ length: item.quantity }, () => ({
            productName: item.productName,
            productImageUrl: item.productImageUrl,
            payload: genCardPayload(item.productId, format),
          }))
        )
        // Fire-and-forget — bot send failure must not block order confirmation
        api.post('/api/deliver', {
          deliveries: deliveries.map((d) => ({ productName: d.productName, payload: d.payload })),
          format,
        }).catch((err) => console.warn('[deliver]', err))

        const state: MockOrderState = { mock: true, format, total, deliveries }
        clear()
        navigate('/order/mock', { state })
        return null
      }

      const body: Record<string, unknown> = {
        note: note || undefined, format,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
      }
      const order: Order = await api.post('/api/orders', body).then((r) => r.data)
      await api.post(`/api/orders/${order.id}/pay`)
      return order
    },
    onSuccess: (order) => {
      if (!order) return
      clear()
      navigate(`/order/${order.id}`)
    },
  })

  const canSubmit = items.length > 0 && !mutation.isPending

  useTelegramMainButton(
    mutation.isPending ? 'TRAITEMENT...' : 'CONFIRMER LA COMMANDE',
    () => mutation.mutate(),
    canSubmit,
    '#1a1500',
    '#fbbf24',
  )

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
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
            {isMock && <span style={{ marginLeft: 8, color: 'rgba(34,211,238,0.6)' }}>· MODE TEST</span>}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Order recap */}
        <Section label="RÉCAPITULATIF">
          {items.map((item, i) => (
            <div key={item.productId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 0',
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 46, height: 29, borderRadius: 5, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a' }}>
                  {item.productImageUrl
                    ? <img src={item.productImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1c1c1e,#0d0d0d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 16, height: 11, borderRadius: 2, background: 'linear-gradient(135deg,#b8860b,#ffd700)' }} />
                      </div>
                  }
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace' }}>{item.productName}</div>
                  {item.quantity > 1 && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginTop: 1 }}>× {item.quantity}</div>}
                </div>
              </div>
              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 16, color: '#fbbf24', letterSpacing: '0.04em' }}>
                €{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </Section>

        {/* Format */}
        <Section label="FORMAT DU FICHIER">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
            {FORMATS.map((f) => (
              <button key={f.value} onClick={() => setFormat(f.value)} style={{
                borderRadius: 10, padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                background: format === f.value ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${format === f.value ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, color: format === f.value ? '#fbbf24' : 'rgba(255,255,255,0.65)', letterSpacing: '0.08em' }}>{f.label}</span>
                  {format === f.value && <span style={{ fontSize: 7, color: '#fbbf24' }}>●</span>}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: '"JetBrains Mono", monospace' }}>{f.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', padding: '9px 11px' }}>
            <div style={{ fontSize: 7, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.18)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 5 }}>APERÇU</div>
            <pre style={{ margin: 0, fontSize: 9, color: 'rgba(251,191,36,0.5)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {items[0] ? (() => { const p = genCardPayload(items[0].productId, format); return p.slice(0, 160) + (p.length > 160 ? '…' : '') })() : ''}
            </pre>
          </div>
        </Section>

        {/* Delivery info */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✉</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em', marginBottom: 2 }}>LIVRAISON DANS CE CHAT</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              Le fichier {format} sera envoyé dans votre conversation avec le bot
            </div>
          </div>
        </div>

        {/* Note */}
        {note && (
          <Section label="NOTE">
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, margin: 0 }}>{note}</p>
          </Section>
        )}

        {/* Total */}
        <div style={{
          background: '#111', borderRadius: 14,
          border: '1px solid rgba(251,191,36,0.2)', borderLeft: '3px solid rgba(251,191,36,0.7)',
          padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 2 }}>TOTAL</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace' }}>fichier inclus dans la commande</div>
          </div>
          <span style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 26, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>
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
      `}</style>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ padding: '11px 15px 0' }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 9 }}>{label}</div>
      </div>
      <div style={{ padding: '0 15px 13px' }}>{children}</div>
    </div>
  )
}
