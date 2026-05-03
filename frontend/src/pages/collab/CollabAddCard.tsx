import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Category } from 'floramini-types'

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'
type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'
type CardType = 'DEBIT' | 'CREDIT'
type CardDevice = 'IPHONE' | 'ANDROID' | 'UNKNOWN'
type CardSource = 'AMELI' | 'MONDIAL_RELAY' | 'AMAZON' | 'OTHER'

interface CardMeta {
  bin: string; bank: string; network: CardNetwork; level: CardLevel
  type: CardType; device: CardDevice; source: CardSource
  recoveryDate: string; ddn: string; cp: string; age: string
}

interface CardForm {
  bin: string
  bank: string
  level: CardLevel
  network: CardNetwork
  cardType: CardType
  device: CardDevice
  source: CardSource
  ddn: string
  recoveryDate: string
  prix: string
  stock: string
  cp: string
  age: string
  categoryId: number
}

interface CollabProduct {
  id: number
  name: string
  description: string
  price: number
  stock: number
  imageUrl: string
  isActive: boolean
  categoryId: number | null
  collaboratorId: number | null
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD = '#fbbf24'
const DANGER = '#ef4444'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)',
  fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' as const,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13,
  fontFamily: '"JetBrains Mono", monospace', outline: 'none', boxSizing: 'border-box' as const,
}

const LEVELS: CardLevel[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']
const NETWORKS: CardNetwork[] = ['VISA', 'MASTERCARD', 'AMEX', 'OTHER']
const CARD_TYPES: CardType[] = ['DEBIT', 'CREDIT']
const DEVICES: CardDevice[] = ['IPHONE', 'ANDROID', 'UNKNOWN']
const SOURCES: CardSource[] = ['AMELI', 'MONDIAL_RELAY', 'AMAZON', 'OTHER']

const LEVEL_COLORS: Record<CardLevel, { bg: string; text: string; border: string }> = {
  CLASSIC:  { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
  GOLD:     { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  PLATINUM: { bg: 'rgba(229,231,235,0.12)', text: '#e5e7eb', border: 'rgba(229,231,235,0.3)' },
  BLACK:    { bg: 'rgba(255,255,255,0.06)', text: '#fff',    border: 'rgba(255,255,255,0.18)' },
}

const NETWORK_COLORS: Record<CardNetwork, { bg: string; text: string; border?: string }> = {
  VISA:       { bg: 'rgba(129,140,248,0.15)', text: '#818cf8' },
  MASTERCARD: { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  AMEX:       { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
  OTHER:      { bg: 'rgba(156,163,175,0.1)',  text: 'rgba(156,163,175,0.6)' },
}

const TYPE_COLORS: Record<CardType, { bg: string; text: string; border?: string }> = {
  DEBIT:  { bg: 'rgba(250,204,21,0.15)', text: '#facc15' },
  CREDIT: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
}

const DEVICE_COLORS: Record<CardDevice, { bg: string; text: string; border?: string }> = {
  IPHONE:  { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
  ANDROID: { bg: 'rgba(34,211,238,0.15)',  text: '#22d3ee' },
  UNKNOWN: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
}

const SOURCE_COLORS: Record<CardSource, { bg: string; text: string; border?: string }> = {
  AMELI:         { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
  MONDIAL_RELAY: { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  AMAZON:        { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  OTHER:         { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' },
}

function parseCardMeta(description: string): CardMeta {
  const d: CardMeta = { bin: '', bank: '', network: 'OTHER', level: 'CLASSIC', type: 'CREDIT', device: 'UNKNOWN', source: 'OTHER', recoveryDate: '', ddn: '', cp: '', age: '' }
  try {
    const m = JSON.parse(description || '{}')
    const b0 = (m.bin || '')[0]
    const autoNetwork: CardNetwork = b0 === '4' ? 'VISA' : b0 === '5' ? 'MASTERCARD' : b0 === '3' ? 'AMEX' : 'OTHER'
    const tags: string[] = m.tags ?? []
    return {
      bin: m.bin ?? '', bank: m.bank ?? '',
      network: m.network ?? autoNetwork,
      level: m.level ?? 'CLASSIC',
      type: m.type ?? (tags.includes('CREDIT') ? 'CREDIT' : 'DEBIT'),
      device: m.device ?? (tags.includes('IPHONE') ? 'IPHONE' : tags.includes('ANDROID') ? 'ANDROID' : 'UNKNOWN'),
      source: m.source ?? (tags.includes('AMELI') ? 'AMELI' : tags.includes('MONDIAL_RELAY') ? 'MONDIAL_RELAY' : tags.includes('AMAZON') ? 'AMAZON' : 'OTHER'),
      recoveryDate: m.recoveryDate ?? '', ddn: m.ddn ?? '',
      cp: m.cp ?? '', age: m.age ? String(m.age) : '',
    }
  } catch { return d }
}

const emptyCardForm = (): CardForm => ({
  bin: '', bank: '', level: 'CLASSIC', network: 'OTHER', cardType: 'CREDIT',
  device: 'UNKNOWN', source: 'OTHER', ddn: '', recoveryDate: '',
  prix: '', stock: '1', cp: '', age: '', categoryId: 0,
})

function buildProductPayload(form: CardForm) {
  return {
    name: `${form.bank} ${form.network} ${form.level}`,
    description: JSON.stringify({
      bin: form.bin, bank: form.bank, network: form.network, level: form.level,
      type: form.cardType, device: form.device, source: form.source,
      recoveryDate: form.recoveryDate, ddn: form.ddn, cp: form.cp, age: form.age,
    }),
    price: parseFloat(form.prix),
    stock: parseInt(form.stock) || 0,
    categoryId: form.categoryId || undefined,
    imageUrl: form.bin.length >= 6 ? `https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png` : '',
    images: [],
  }
}

// ── Card form fields ───────────────────────────────────────────────────────────
function CardFormFields({ form, onChange, categories }: {
  form: CardForm
  onChange: (f: CardForm) => void
  categories: Category[]
}) {
  function set(patch: Partial<CardForm>) { onChange({ ...form, ...patch }) }

  function toggleBtn(active: boolean, color: { bg: string; text: string; border?: string }) {
    return {
      flex: 1, padding: '8px 0', borderRadius: 9,
      border: `1px solid ${active ? (color.border ?? color.bg) : 'rgba(255,255,255,0.07)'}`,
      background: active ? color.bg : 'transparent',
      color: active ? color.text : 'rgba(255,255,255,0.2)',
      fontSize: 9, ...MONO, fontWeight: 700 as const, letterSpacing: '0.06em', cursor: 'pointer' as const,
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* BIN + Bank */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>BIN (6 chiffres)</div>
          <input
            style={INPUT_STYLE}
            value={form.bin}
            onChange={e => {
              const bin = e.target.value.replace(/\D/g, '').slice(0, 6)
              const b0 = bin[0]
              const network: CardNetwork = b0 === '4' ? 'VISA' : b0 === '5' ? 'MASTERCARD' : b0 === '3' ? 'AMEX' : form.network
              set({ bin, network })
            }}
            placeholder="456789"
            inputMode="numeric"
            maxLength={6}
          />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Banque</div>
          <input
            style={INPUT_STYLE}
            value={form.bank}
            onChange={e => set({ bank: e.target.value })}
            placeholder="BNP Paribas"
          />
        </div>
      </div>

      {/* BIN preview */}
      {form.bin.length >= 6 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(251,191,36,0.04)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.1)' }}>
          <img
            src={`https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png`}
            alt=""
            style={{ width: 52, height: 33, objectFit: 'cover', borderRadius: 5 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span style={{ fontSize: 9, color: 'rgba(251,191,36,0.5)', ...MONO }}>IMAGE AUTO · {form.bin.slice(0, 6)}</span>
        </div>
      )}

      {/* Niveau */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Niveau</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {LEVELS.map(lvl => (
            <button key={lvl} onClick={() => set({ level: lvl })} style={toggleBtn(form.level === lvl, LEVEL_COLORS[lvl])}>
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Réseau */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Réseau</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {NETWORKS.map(net => (
            <button key={net} onClick={() => set({ network: net })} style={toggleBtn(form.network === net, NETWORK_COLORS[net])}>
              {net}
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Type</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {CARD_TYPES.map(t => (
            <button key={t} onClick={() => set({ cardType: t })} style={toggleBtn(form.cardType === t, TYPE_COLORS[t])}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Appareil */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Appareil</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DEVICES.map(d => (
            <button key={d} onClick={() => set({ device: d })} style={toggleBtn(form.device === d, DEVICE_COLORS[d])}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Source</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SOURCES.map(s => (
            <button key={s} onClick={() => set({ source: s })} style={toggleBtn(form.source === s, SOURCE_COLORS[s])}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* DDN + Date récup */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>DDN (pré-vente)</div>
          <input
            style={INPUT_STYLE}
            value={form.ddn}
            onChange={e => set({ ddn: e.target.value })}
            placeholder="JJ/MM/AAAA"
          />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Date récupération</div>
          <input
            style={{ ...INPUT_STYLE, colorScheme: 'dark' } as React.CSSProperties}
            type="date"
            value={form.recoveryDate}
            onChange={e => set({ recoveryDate: e.target.value })}
          />
        </div>
      </div>

      {/* Prix + Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Prix (€)</div>
          <input
            style={INPUT_STYLE}
            type="number"
            value={form.prix}
            onChange={e => set({ prix: e.target.value })}
            placeholder="49.99"
            inputMode="decimal"
          />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Stock</div>
          <input
            style={INPUT_STYLE}
            type="number"
            value={form.stock}
            onChange={e => set({ stock: e.target.value })}
            placeholder="1"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* CP + Âge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Code Postal</div>
          <input
            style={INPUT_STYLE}
            value={form.cp}
            onChange={e => set({ cp: e.target.value })}
            placeholder="75001"
          />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Âge titulaire</div>
          <input
            style={INPUT_STYLE}
            value={form.age}
            onChange={e => set({ age: e.target.value })}
            placeholder="35"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* Catégorie */}
      {categories.length > 0 && (
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Catégorie</div>
          <select
            style={{ ...INPUT_STYLE, appearance: 'none' as any }}
            value={form.categoryId}
            onChange={e => set({ categoryId: Number(e.target.value) })}
          >
            <option value={0}>— Aucune —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function CollabAddCard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const productId = id ? parseInt(id) : null

  const [form, setForm] = useState<CardForm>(emptyCardForm())
  const [error, setError] = useState<string | null>(null)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
  })

  const { data: existingProduct } = useQuery<CollabProduct>({
    queryKey: ['collab-product', productId],
    queryFn: () => api.get(`/api/collab/products`).then(r => {
      const products: CollabProduct[] = r.data
      const found = products.find(p => p.id === productId)
      if (!found) throw new Error('Not found')
      return found
    }),
    enabled: isEdit && productId !== null,
  })

  useEffect(() => {
    if (existingProduct) {
      const meta = parseCardMeta(existingProduct.description)
      setForm({
        bin: meta.bin, bank: meta.bank, level: meta.level, network: meta.network,
        cardType: meta.type, device: meta.device, source: meta.source,
        ddn: meta.ddn, recoveryDate: meta.recoveryDate,
        prix: String(existingProduct.price), stock: String(existingProduct.stock),
        cp: meta.cp, age: meta.age, categoryId: existingProduct.categoryId ?? 0,
      })
    }
  }, [existingProduct])

  const saveMutation = useMutation({
    mutationFn: (body: object) => {
      if (isEdit && productId) {
        return api.put(`/api/collab/products/${productId}`, body).then(r => r.data)
      }
      return api.post('/api/collab/products', body).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      navigate('/collab')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Erreur lors de la sauvegarde.')
    },
  })

  function handleSubmit() {
    if (!form.bin || !form.bank || !form.prix) {
      setError('BIN, banque et prix sont requis.')
      return
    }
    setError(null)
    saveMutation.mutate(buildProductPayload(form))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/collab')}
          style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>
            {isEdit ? 'MODIFIER LA CARTE' : 'NOUVELLE CARTE'}
          </div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 32px' }}>
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
          <div style={{ ...LABEL_STYLE, color: GOLD, marginBottom: 16 }}>
            {isEdit ? '· MODIFIER LES INFORMATIONS' : '· INFORMATIONS DE LA CARTE'}
          </div>

          <CardFormFields form={form} onChange={setForm} categories={categories} />

          {error && (
            <div style={{ marginTop: 12, fontSize: 12, ...MONO, color: DANGER, padding: '8px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              style={{
                flex: 1, padding: '13px 0', borderRadius: 10,
                background: saveMutation.isPending ? 'rgba(251,191,36,0.3)' : GOLD,
                color: '#050505', border: 'none',
                ...BEBAS, fontSize: 15, letterSpacing: '0.1em',
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {saveMutation.isPending ? '...' : isEdit ? 'SAUVEGARDER' : 'AJOUTER LA CARTE'}
            </button>
            <button
              onClick={() => navigate('/collab')}
              style={{
                padding: '13px 18px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)', ...BEBAS, fontSize: 15, letterSpacing: '0.06em', cursor: 'pointer',
              }}
            >
              ANNULER
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #1a1a1a; color: #fff; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
