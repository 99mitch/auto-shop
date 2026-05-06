import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import type { Order, CryptoPaymentInfo } from 'floramini-types'

const CURRENCIES = [
  { value: 'USDT', label: 'USDT TRC-20' },
  { value: 'ETH',  label: 'ETH' },
  { value: 'SOL',  label: 'SOL' },
] as const
type CryptoCurrency = 'USDT' | 'ETH' | 'SOL'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, note, subtotal, clear } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'CRYPTO'>('BALANCE')
  const [cryptoCurrency, setCryptoCurrency] = useState<CryptoCurrency>('USDT')
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentInfo | null>(null)

  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ['balance'],
    queryFn: () => api.get('/api/balance').then((r) => r.data),
  })
  const balance = balanceData?.balance ?? 0

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
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
      }
      const order: Order = await api.post('/api/orders', body).then((r) => r.data)
      const payRes = await api.post(`/api/orders/${order.id}/pay`, { paymentMethod, cryptoCurrency })
      if (payRes.data?.cryptoPayment) {
        setCryptoPayment(payRes.data.cryptoPayment)
        return null
      }
      return order
    },
    onSuccess: (order) => {
      if (!order) return
      clear()
      navigate(`/order/${order.id}`)
    },
  })

  const canSubmit = items.length > 0 && !mutation.isPending && (paymentMethod === 'CRYPTO' || balance >= total)

  useTelegramMainButton(
    mutation.isPending ? 'TRAITEMENT...' : 'CONFIRMER LA COMMANDE',
    () => mutation.mutate(),
    canSubmit,
    '#1a1500',
    '#fbbf24',
  )

  const currencyLabel = CURRENCIES.find((c) => c.value === cryptoCurrency)?.label ?? cryptoCurrency

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>

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
          </div>
        </div>
      </div>

      {cryptoPayment && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
          <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.2em', color: 'rgba(251,191,36,0.6)' }}>
            ENVOIE {currencyLabel} À CETTE ADRESSE
          </div>
          <img src={cryptoPayment.qrCode} alt="QR" style={{ width: 180, height: 180, borderRadius: 12 }} />
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: '#fff', wordBreak: 'break-all', textAlign: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            {cryptoPayment.walletAddress}
          </div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(255,255,255,0.3)' }}>
            La livraison se fait automatiquement après réception du paiement
          </div>
        </div>
      )}

      {!cryptoPayment && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          <Section label="RÉCAPITULATIF">
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
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
            </div>
          </Section>

          <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✉</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em', marginBottom: 2 }}>LIVRAISON DANS CE CHAT</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
                Cartes envoyées automatiquement via le bot Telegram
              </div>
            </div>
          </div>

          {note && (
            <Section label="NOTE">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, margin: 0 }}>{note}</p>
            </Section>
          )}

          <div style={{ background: '#111', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '14px' }}>
            <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>MODE DE PAIEMENT</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: paymentMethod === 'CRYPTO' ? 10 : 0 }}>
              {(['BALANCE', 'CRYPTO'] as const).map((m) => {
                const active = paymentMethod === m
                return (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                      background: active ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.08em' }}>
                      {m === 'BALANCE' ? 'SOLDE' : 'CRYPTO'}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 3 }}>
                      {m === 'BALANCE' ? `€${balance.toFixed(2)} dispo` : 'QR code'}
                    </div>
                  </button>
                )
              })}
            </div>
            {paymentMethod === 'CRYPTO' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {CURRENCIES.map((c) => {
                  const active = cryptoCurrency === c.value
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCryptoCurrency(c.value)}
                      style={{
                        flex: 1, padding: '8px 6px', borderRadius: 9, cursor: 'pointer',
                        background: active ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        fontFamily: '"JetBrains Mono",monospace', fontSize: 9, fontWeight: 700,
                        color: active ? '#fbbf24' : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em',
                      }}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            )}
            {paymentMethod === 'BALANCE' && balance < total && (
              <div style={{ marginTop: 8, fontSize: 10, color: '#ef4444', fontFamily: '"JetBrains Mono",monospace' }}>
                Solde insuffisant — recharge dans ton profil
              </div>
            )}
          </div>

          <div style={{
            background: '#111', borderRadius: 14,
            border: '1px solid rgba(251,191,36,0.2)', borderLeft: '3px solid rgba(251,191,36,0.7)',
            padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 2 }}>TOTAL</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace' }}>livraison via bot incluse</div>
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
      )}

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
