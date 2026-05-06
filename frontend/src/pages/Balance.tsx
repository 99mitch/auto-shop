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
  borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 14, ...MONO, outline: 'none',
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

function QRFlow({ payment, currency, onConfirmed }: { payment: CryptoPaymentInfo; currency: CryptoCurrency; onConfirmed: () => void }) {
  const [status, setStatus] = useState<string>('pending')
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

  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(251,191,36,0.6)' }}>
        ENVOIE {currencyLabel} À CETTE ADRESSE
      </div>
      {payment.qrCode && (
        <img src={payment.qrCode} alt="QR" style={{ width: 160, height: 160, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
      )}
      <div style={{ ...MONO, fontSize: 9, color: '#fff', wordBreak: 'break-all', textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
        {payment.walletAddress}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.3)' }}>
        <span>Expire dans {expiresIn} min</span>
        <span>·</span>
        <span style={{ color: status === 'pending' ? '#fbbf24' : '#4ade80' }}>
          {status === 'pending' ? '⏳ En attente...' : status === 'confirmed' ? '✅ Confirmé !' : status}
        </span>
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
  }

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MON SOLDE</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>USDT · ETH · SOL</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>SOLDE DISPONIBLE</div>
          {isLoading ? (
            <div style={{ height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <div style={{ ...BEBAS, fontSize: 42, color: GOLD, letterSpacing: '0.04em', lineHeight: 1 }}>
              €{(data?.balance ?? 0).toFixed(2)}
            </div>
          )}
        </div>

        {cryptoPayment && <QRFlow payment={cryptoPayment} currency={activeCurrency} onConfirmed={handleConfirmed} />}

        {!cryptoPayment && (
          <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>RECHARGER PAR CRYPTO</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {CURRENCIES.map((c) => {
                const active = currency === c.value
                return (
                  <button
                    key={c.value}
                    onClick={() => setCurrency(c.value)}
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

            <input
              style={INPUT_STYLE}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant (min. 1)"
              inputMode="decimal"
            />
            {error && <div style={{ marginTop: 8, fontSize: 11, ...MONO, color: '#ef4444' }}>{error}</div>}
            <button
              onClick={handleTopup}
              disabled={topupMutation.isPending}
              style={{ marginTop: 12, width: '100%', padding: '13px', borderRadius: 10, background: topupMutation.isPending ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: topupMutation.isPending ? 'not-allowed' : 'pointer' }}
            >
              {topupMutation.isPending ? '...' : `GÉNÉRER ADRESSE ${CURRENCIES.find((c) => c.value === currency)?.label}`}
            </button>
          </div>
        )}

        {(data?.topUps?.length ?? 0) > 0 && (
          <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>HISTORIQUE RECHARGES</div>
            {data!.topUps.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ ...MONO, fontSize: 10, color: t.status === 'CONFIRMED' ? '#4ade80' : '#fbbf24' }}>
                    {t.status === 'CONFIRMED' ? '✅' : '⏳'} {t.status}
                  </div>
                  <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ ...BEBAS, fontSize: 18, color: GOLD }}>+€{t.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); ::-webkit-scrollbar { display: none; } input::placeholder { color: rgba(255,255,255,0.2); }`}</style>
    </div>
  )
}
