import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { BalanceTopUp, CryptoPaymentInfo } from 'floramini-types'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '11px 14px', color: '#fff', fontSize: 14, ...MONO, outline: 'none',
  boxSizing: 'border-box' as const,
}

const CURRENCIES = [
  { value: 'USDT', label: 'USDT TRC-20' },
  { value: 'ETH',  label: 'ETH' },
  { value: 'SOL',  label: 'SOL' },
] as const
type CryptoCurrency = 'USDT' | 'ETH' | 'SOL'

interface BalanceData { balance: number; topUps: BalanceTopUp[] }
interface TopupResult { topUp: BalanceTopUp; payment: CryptoPaymentInfo }

interface PaymentDetails extends CryptoPaymentInfo {
  status: string
  currency: CryptoCurrency
  amount: number
  receivedAmount?: number
  txHash?: string | null
}

function statusLabel(s: string) {
  switch (s) {
    case 'pending':   return { label: 'EN ATTENTE',  color: '#fbbf24', icon: '⏳' }
    case 'confirmed': return { label: 'CONFIRMÉ',    color: '#4ade80', icon: '✅' }
    case 'swept':     return { label: 'TRANSFÉRÉ',   color: '#4ade80', icon: '✅' }
    case 'expired':   return { label: 'EXPIRÉ',      color: '#ef4444', icon: '❌' }
    case 'cancelled': return { label: 'ANNULÉ',      color: 'rgba(255,255,255,0.4)', icon: '⊘' }
    default:          return { label: s.toUpperCase(), color: 'rgba(255,255,255,0.5)', icon: '•' }
  }
}

function QRFlow({ payment, currency, onConfirmed, onClose }: { payment: CryptoPaymentInfo; currency: CryptoCurrency; onConfirmed: () => void; onClose?: () => void }) {
  const [status, setStatus] = useState<string>('pending')
  const [copied, setCopied] = useState(false)
  const currencyLabel = CURRENCIES.find((c) => c.value === currency)?.label ?? currency

  useEffect(() => {
    if (status === 'confirmed' || status === 'swept') { onConfirmed(); return }
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/balance/topup/${payment.paymentId}/status`)
        setStatus(data.status)
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [status, payment.paymentId, onConfirmed])

  const expiresIn = Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000 / 60))
  const meta = statusLabel(status)

  function copyAddr() {
    navigator.clipboard.writeText(payment.walletAddress).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, #161616 0%, #111 100%)', borderRadius: 16, border: '1px solid rgba(251,191,36,0.25)', padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative' }}>
      {onClose && (
        <button onClick={onClose} aria-label="Fermer"
          style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>×</button>
      )}
      <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.22em', color: 'rgba(251,191,36,0.7)' }}>
        ENVOIE {currencyLabel} À CETTE ADRESSE
      </div>
      {payment.qrCode && (
        <div style={{ padding: 8, background: '#fff', borderRadius: 12 }}>
          <img src={payment.qrCode} alt="QR" style={{ width: 168, height: 168, display: 'block' }} />
        </div>
      )}
      <button onClick={copyAddr}
        style={{ ...MONO, fontSize: 9, color: '#fff', wordBreak: 'break-all', textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: '10px 12px', width: '100%', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', position: 'relative' }}>
        {payment.walletAddress}
        <span style={{ display: 'block', marginTop: 6, fontSize: 8, color: copied ? '#4ade80' : 'rgba(251,191,36,0.7)', letterSpacing: '0.15em' }}>
          {copied ? '✓ COPIÉ' : 'TAP POUR COPIER'}
        </span>
      </button>
      <div style={{ display: 'flex', gap: 10, fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.4)', alignItems: 'center' }}>
        <span>EXPIRE {expiresIn}m</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
        <span style={{ color: meta.color, letterSpacing: '0.1em' }}>{meta.icon} {meta.label}</span>
      </div>
    </div>
  )
}

export default function Balance() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CryptoCurrency>('USDT')
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentInfo | null>(null)
  const [activeCurrency, setActiveCurrency] = useState<CryptoCurrency>('USDT')
  const [error, setError] = useState<string | null>(null)
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null)
  const [openLoading, setOpenLoading] = useState(false)

  const { data, isLoading } = useQuery<BalanceData>({
    queryKey: ['balance'],
    queryFn: () => api.get('/api/balance').then((r) => r.data),
  })

  const topupMutation = useMutation({
    mutationFn: (opts: { amt: number; cur: CryptoCurrency }) =>
      api.post('/api/balance/topup', { amount: opts.amt, currency: opts.cur }).then((r) => r.data as TopupResult),
    onSuccess: (result, vars) => {
      setCryptoPayment(result.payment)
      setActiveCurrency(vars.cur)
      setAmount('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erreur'),
  })

  function handleTopup() {
    const amt = parseFloat(amount)
    if (!isFinite(amt) || amt < 1) { setError('Montant minimum : 1'); return }
    setError(null)
    topupMutation.mutate({ amt, cur: currency })
  }

  function handleConfirmed() {
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    setCryptoPayment(null)
    setOpenPaymentId(null)
  }

  async function openHistoryPayment(t: BalanceTopUp) {
    if (t.status === 'CONFIRMED') return
    setOpenLoading(true)
    setOpenPaymentId(t.paymentId)
    try {
      const { data } = await api.get<PaymentDetails>(`/api/balance/topup/${t.paymentId}`)
      if (data.status === 'expired' || data.status === 'cancelled') {
        setError(`Ce paiement est ${data.status === 'expired' ? 'expiré' : 'annulé'}. Crée un nouveau paiement.`)
        setOpenPaymentId(null)
        return
      }
      setCryptoPayment({
        paymentId: data.paymentId,
        walletAddress: data.walletAddress,
        qrCode: data.qrCode ?? '',
        expiresAt: data.expiresAt,
      })
      setActiveCurrency(data.currency)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Impossible de récupérer le paiement')
      setOpenPaymentId(null)
    } finally {
      setOpenLoading(false)
    }
  }

  const showQR = !!cryptoPayment

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 22, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MON SOLDE</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>USDT · ETH · SOL</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'radial-gradient(120% 100% at 50% 0%, rgba(251,191,36,0.10) 0%, #111 60%)', borderRadius: 16, border: '1px solid rgba(251,191,36,0.22)', padding: '18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)' }} />
          <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>SOLDE DISPONIBLE</div>
          {isLoading ? (
            <div style={{ height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <div style={{ ...BEBAS, fontSize: 42, color: GOLD, letterSpacing: '0.04em', lineHeight: 1, textShadow: '0 0 30px rgba(251,191,36,0.3)' }}>
              €{(data?.balance ?? 0).toFixed(2)}
            </div>
          )}
        </div>

        {showQR && cryptoPayment && (
          <QRFlow
            payment={cryptoPayment}
            currency={activeCurrency}
            onConfirmed={handleConfirmed}
            onClose={openPaymentId ? () => { setCryptoPayment(null); setOpenPaymentId(null) } : undefined}
          />
        )}

        {!showQR && (
          <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: '14px 14px 16px', flexShrink: 0 }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>RECHARGER PAR CRYPTO</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {CURRENCIES.map((c) => {
                const active = currency === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setCurrency(c.value)}
                    style={{
                      flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                      background: active ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      ...MONO, fontSize: 9, fontWeight: 700,
                      color: active ? '#fbbf24' : 'rgba(255,255,255,0.4)', letterSpacing: '0.06em',
                      transition: 'all 0.15s',
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            <input
              style={INPUT_STYLE}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant (min. 1)"
              inputMode="decimal"
            />
            {error && <div style={{ marginTop: 10, fontSize: 11, ...MONO, color: '#ef4444' }}>{error}</div>}
            <button
              onClick={handleTopup}
              disabled={topupMutation.isPending}
              style={{ marginTop: 14, width: '100%', padding: '14px', borderRadius: 11, background: topupMutation.isPending ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 16, letterSpacing: '0.1em', cursor: topupMutation.isPending ? 'not-allowed' : 'pointer', boxShadow: topupMutation.isPending ? 'none' : '0 8px 24px rgba(251,191,36,0.18)' }}
            >
              {topupMutation.isPending ? '...' : `GÉNÉRER ADRESSE ${CURRENCIES.find((c) => c.value === currency)?.label}`}
            </button>
          </div>
        )}

        {(data?.topUps?.length ?? 0) > 0 && (
          <div style={{ background: '#111', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', padding: '14px 14px 6px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexShrink: 0 }}>
              <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)' }}>HISTORIQUE RECHARGES</div>
              <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{data!.topUps.length}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1, minHeight: 0, paddingBottom: 8 }}>
              {data!.topUps.map((t) => {
                const isPending = t.status === 'PENDING'
                const isClickable = isPending
                return (
                  <button
                    key={t.id}
                    onClick={isClickable ? () => openHistoryPayment(t) : undefined}
                    disabled={!isClickable || (openLoading && openPaymentId === t.paymentId)}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 12px', borderRadius: 10,
                      background: isClickable ? 'rgba(251,191,36,0.04)' : 'transparent',
                      border: `1px solid ${isClickable ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)'}`,
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ ...MONO, fontSize: 10, color: isPending ? '#fbbf24' : '#4ade80', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isPending ? '⏳' : '✅'} {t.status}
                        {isClickable && (
                          <span style={{ fontSize: 8, color: 'rgba(251,191,36,0.6)', letterSpacing: '0.15em' }}>
                            {openLoading && openPaymentId === t.paymentId ? '· OUVERTURE...' : '· REPRENDRE →'}
                          </span>
                        )}
                      </div>
                      <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                        {new Date(t.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ ...BEBAS, fontSize: 20, color: isPending ? 'rgba(251,191,36,0.85)' : GOLD, letterSpacing: '0.04em' }}>+€{t.amount.toFixed(2)}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
