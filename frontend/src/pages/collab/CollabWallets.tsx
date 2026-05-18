import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'

interface CollabWallet {
  id: number
  currency: string
  address: string
  updatedAt: string
}

const GOLD = '#fbbf24'
const DANGER = '#ef4444'
const SUCCESS = '#4ade80'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)',
  fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' as const,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 12,
  fontFamily: '"JetBrains Mono", monospace', outline: 'none', boxSizing: 'border-box' as const,
}

const CURRENCIES = [
  { code: 'USDT', label: 'USDT (Tron / TRC20)', placeholder: 'TXyZ...' },
  { code: 'ETH', label: 'Ethereum', placeholder: '0xabc...' },
  { code: 'SOL', label: 'Solana', placeholder: 'address Solana' },
] as const

function WalletRow({ currency, label, placeholder, existing }: {
  currency: 'USDT' | 'ETH' | 'SOL'
  label: string
  placeholder: string
  existing: CollabWallet | undefined
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(existing?.address ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(existing?.address ?? '')
  }, [existing?.address])

  const save = useMutation({
    mutationFn: () =>
      api.put(`/api/collab/wallets/${currency}`, { address: value.trim() }).then((r) => r.data),
    onSuccess: () => {
      setError(null)
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['collab-wallets'] })
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? 'Erreur enregistrement'),
  })

  const del = useMutation({
    mutationFn: () => api.delete(`/api/collab/wallets/${currency}`).then((r) => r.data),
    onSuccess: () => {
      setValue('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['collab-wallets'] })
    },
  })

  const dirty = value.trim() !== (existing?.address ?? '')

  return (
    <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...LABEL_STYLE, color: existing ? SUCCESS : 'rgba(255,255,255,0.4)' }}>{label}</div>
        {existing && (
          <div style={{ fontSize: 8, color: SUCCESS, ...MONO, letterSpacing: '0.1em' }}>● CONFIGURÉ</div>
        )}
      </div>
      <input
        style={INPUT_STYLE}
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        placeholder={placeholder}
        spellCheck={false}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending || !value.trim()}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            background: dirty && value.trim() ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${dirty && value.trim() ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)'}`,
            color: dirty && value.trim() ? GOLD : 'rgba(255,255,255,0.2)',
            ...BEBAS, fontSize: 11, letterSpacing: '0.08em',
            cursor: dirty && value.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {save.isPending ? '...' : saved ? '✓ ENREGISTRÉ' : existing ? 'METTRE À JOUR' : 'ENREGISTRER'}
        </button>
        {existing && (
          <button
            onClick={() => del.mutate()}
            disabled={del.isPending}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: DANGER, ...BEBAS, fontSize: 11, letterSpacing: '0.06em', cursor: 'pointer',
            }}
          >
            SUPPR.
          </button>
        )}
      </div>
      {error && (
        <div style={{ marginTop: 8, fontSize: 10, ...MONO, color: DANGER, padding: '6px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
          {error}
        </div>
      )}
    </div>
  )
}

export default function CollabWallets() {
  const navigate = useNavigate()
  useTelegramBackButton(useCallback(() => navigate('/collab'), [navigate]))

  const { data: wallets = [], isLoading } = useQuery<CollabWallet[]>({
    queryKey: ['collab-wallets'],
    queryFn: () => api.get('/api/collab/wallets').then((r) => r.data),
  })

  const byCurrency = new Map(wallets.map((w) => [w.currency, w]))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/collab')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MES WALLETS</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px' }}>
        <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(251,191,36,0.85)', ...MONO, lineHeight: 1.4 }}>
            Renseigne au moins un wallet pour recevoir tes gains automatiquement à chaque vente. Sans wallet configuré pour la crypto choisie par l'acheteur, ta part est enregistrée en attente et payée manuellement par l'admin.
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 0' }}>
            <div style={{ ...LABEL_STYLE }}>ADRESSES DE PAYOUT</div>
          </div>
          {isLoading ? (
            <div style={{ padding: '14px', color: 'rgba(255,255,255,0.3)', fontSize: 11, ...MONO }}>Chargement…</div>
          ) : (
            CURRENCIES.map((c) => (
              <WalletRow
                key={c.code}
                currency={c.code}
                label={c.label}
                placeholder={c.placeholder}
                existing={byCurrency.get(c.code)}
              />
            ))
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
