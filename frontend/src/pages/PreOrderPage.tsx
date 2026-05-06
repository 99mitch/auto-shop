// frontend/src/pages/PreOrderPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CryptoPaymentInfo } from 'floramini-types'

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'
type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'
type CardType = 'DEBIT' | 'CREDIT'
type AgeRange = '18-30' | '31-45' | '46-60' | '61+'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }
const LABEL: React.CSSProperties = { fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', ...MONO, textTransform: 'uppercase' as const }
const INPUT: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13, ...MONO, outline: 'none', boxSizing: 'border-box' as const }

const LEVELS: CardLevel[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']
const NETWORKS: CardNetwork[] = ['VISA', 'MASTERCARD', 'AMEX', 'OTHER']
const CARD_TYPES: CardType[] = ['DEBIT', 'CREDIT']
const AGE_RANGES: AgeRange[] = ['18-30', '31-45', '46-60', '61+']

const LEVEL_COLORS: Record<CardLevel, string> = { CLASSIC: '#9ca3af', GOLD: '#fbbf24', PLATINUM: '#e5e7eb', BLACK: '#fff' }
const NET_COLORS: Record<CardNetwork, string> = { VISA: '#818cf8', MASTERCARD: '#fb923c', AMEX: '#4ade80', OTHER: '#9ca3af' }
const TYPE_COLORS: Record<CardType, string> = { DEBIT: '#facc15', CREDIT: '#4ade80' }

export default function PreOrderPage() {
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'CRYPTO'>('BALANCE')
  const [quantity, setQuantity] = useState('1')
  const [pricePerCard, setPricePerCard] = useState('')
  const [bank, setBank] = useState('')
  const [department, setDepartment] = useState('')
  const [bin, setBin] = useState('')
  const [level, setLevel] = useState<CardLevel | ''>('')
  const [network, setNetwork] = useState<CardNetwork | ''>('')
  const [cardType, setCardType] = useState<CardType | ''>('')
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentInfo | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ['balance'],
    queryFn: () => api.get('/api/balance').then((r) => r.data),
  })
  const balance = balanceData?.balance ?? 0

  const total = (parseInt(quantity) || 0) * (parseFloat(pricePerCard) || 0)

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/preorders', {
        paymentMethod, quantity: parseInt(quantity), pricePerCard: parseFloat(pricePerCard),
        ...(bank ? { bank } : {}),
        ...(department ? { department } : {}),
        ...(bin ? { bin } : {}),
        ...(level ? { level } : {}),
        ...(network ? { network } : {}),
        ...(cardType ? { cardType } : {}),
        ...(ageRange ? { ageRange } : {}),
      }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.cryptoPayment) {
        setCryptoPayment(data.cryptoPayment)
      } else {
        setSuccess(true)
      }
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erreur'),
  })

  function handleSubmit() {
    if (!quantity || !pricePerCard) { setError('Quantité et prix/carte requis'); return }
    if (paymentMethod === 'BALANCE' && balance < total) { setError('Solde insuffisant'); return }
    setError(null)
    mutation.mutate()
  }

  function toggleBtn<T extends string>(val: T, current: T | '', color: string): React.CSSProperties {
    const active = current === val
    return {
      flex: 1, padding: '7px 0', borderRadius: 9, cursor: 'pointer' as const,
      border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.07)'}`,
      background: active ? color + '18' : 'transparent',
      color: active ? color : 'rgba(255,255,255,0.2)',
      fontSize: 8, ...MONO, fontWeight: 700 as const, letterSpacing: '0.06em',
    }
  }

  if (success) {
    return (
      <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ ...BEBAS, fontSize: 24, color: '#fff', letterSpacing: '0.08em', textAlign: 'center' }}>PRÉCOMMANDE ENVOYÉE</div>
        <div style={{ ...MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.6 }}>
          Un admin va valider ta demande. Tu seras notifié par Telegram.
        </div>
        <button onClick={() => navigate('/mes-precommandes')} style={{ marginTop: 8, padding: '12px 24px', borderRadius: 10, background: GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer' }}>
          MES PRÉCOMMANDES
        </button>
      </div>
    )
  }

  if (cryptoPayment) {
    return (
      <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(251,191,36,0.6)' }}>PAYER EN USDT TRC-20</div>
        <img src={cryptoPayment.qrCode} alt="QR" style={{ width: 180, height: 180, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
        <div style={{ ...MONO, fontSize: 9, color: '#fff', wordBreak: 'break-all', textAlign: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>{cryptoPayment.walletAddress}</div>
        <div style={{ ...BEBAS, fontSize: 24, color: GOLD }}>€{total.toFixed(2)} USDT</div>
        <div style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          Après paiement, l'admin validera ta précommande et les cartes arriveront automatiquement.
        </div>
        <button onClick={() => navigate('/mes-precommandes')} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', ...MONO, fontSize: 10, cursor: 'pointer' }}>
          MES PRÉCOMMANDES
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>PRÉCOMMANDE CC</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2 }}>Cartes livrées automatiquement selon tes filtres</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Quantité</div>
              <input style={INPUT} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" inputMode="numeric" min={1} max={100} />
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Prix/carte (€)</div>
              <input style={INPUT} type="number" value={pricePerCard} onChange={(e) => setPricePerCard(e.target.value)} placeholder="50.00" inputMode="decimal" />
            </div>
          </div>

          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(251,191,36,0.04)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.12)' }}>
              <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>TOTAL RÉSERVÉ</span>
              <span style={{ ...BEBAS, fontSize: 22, color: GOLD }}>€{total.toFixed(2)}</span>
            </div>
          )}

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Mode de paiement</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['BALANCE', 'CRYPTO'] as const).map((m) => {
                const active = paymentMethod === m
                return (
                  <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(251,191,36,0.08)' : 'transparent' }}>
                    <div style={{ ...MONO, fontSize: 9, fontWeight: 700, color: active ? GOLD : 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>{m === 'BALANCE' ? 'SOLDE' : 'CRYPTO'}</div>
                    <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                      {m === 'BALANCE' ? `€${balance.toFixed(2)} dispo` : 'QR USDT'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ ...LABEL, color: 'rgba(251,191,36,0.5)' }}>· FILTRES (optionnels)</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Banque</div>
              <input style={INPUT} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BNP Paribas" />
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>BIN (préfixe)</div>
              <input style={INPUT} value={bin} onChange={(e) => setBin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="456789" inputMode="numeric" />
            </div>
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Département</div>
            <input style={INPUT} value={department} onChange={(e) => setDepartment(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="75" inputMode="numeric" />
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Level</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(level === l ? '' : l)} style={toggleBtn(l, level, LEVEL_COLORS[l])}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Réseau</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {NETWORKS.map((n) => (
                <button key={n} onClick={() => setNetwork(network === n ? '' : n)} style={toggleBtn(n, network, NET_COLORS[n])}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CARD_TYPES.map((t) => (
                <button key={t} onClick={() => setCardType(cardType === t ? '' : t)} style={toggleBtn(t, cardType, TYPE_COLORS[t])}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Tranche d'âge</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {AGE_RANGES.map((a) => (
                <button key={a} onClick={() => setAgeRange(ageRange === a ? '' : a)} style={toggleBtn(a, ageRange, '#c084fc')}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 11, ...MONO, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.07)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || total === 0}
            style={{ padding: '13px', borderRadius: 10, background: mutation.isPending || total === 0 ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: mutation.isPending || total === 0 ? 'not-allowed' : 'pointer' }}
          >
            {mutation.isPending ? '...' : `PRÉCOMMANDER — €${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); * { box-sizing: border-box; } input::placeholder { color: rgba(255,255,255,0.2); } ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
