import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Category } from 'floramini-types'

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'

interface CardForm {
  bin: string
  bank: string
  level: CardLevel
  prix: string
  stock: string
  cp: string
  age: string
  tags: string[]
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

const AVAILABLE_TAGS = ['CREDIT', 'DEBIT', 'IPHONE', 'ANDROID', 'AMELI']
const LEVELS: CardLevel[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']
const LEVEL_COLORS: Record<CardLevel, { bg: string; text: string; border: string }> = {
  CLASSIC:  { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af', border: 'rgba(156,163,175,0.25)' },
  GOLD:     { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  PLATINUM: { bg: 'rgba(229,231,235,0.12)', text: '#e5e7eb', border: 'rgba(229,231,235,0.3)' },
  BLACK:    { bg: 'rgba(255,255,255,0.06)', text: '#fff',    border: 'rgba(255,255,255,0.18)' },
}

const emptyCardForm = (): CardForm => ({
  bin: '', bank: '', level: 'CLASSIC', prix: '', stock: '1', cp: '', age: '', tags: [], categoryId: 0,
})

function parseCardMeta(p: CollabProduct): CardForm {
  try {
    const m = JSON.parse(p.description || '{}')
    return {
      bin: m.bin ?? '',
      bank: m.bank ?? '',
      level: m.level ?? 'CLASSIC',
      prix: String(p.price),
      stock: String(p.stock),
      cp: m.cp ?? '',
      age: m.age ?? '',
      tags: m.tags ?? [],
      categoryId: p.categoryId ?? 0,
    }
  } catch {
    return { ...emptyCardForm(), prix: String(p.price), stock: String(p.stock), categoryId: p.categoryId ?? 0 }
  }
}

function buildProductPayload(form: CardForm) {
  return {
    name: `${form.bank} ${form.level}`,
    description: JSON.stringify({ bin: form.bin, bank: form.bank, level: form.level, cp: form.cp, age: form.age, tags: form.tags }),
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
  function toggleTag(tag: string) {
    set({ tags: form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag] })
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
            onChange={e => set({ bin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
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
          {LEVELS.map(lvl => {
            const c = LEVEL_COLORS[lvl]
            const active = form.level === lvl
            return (
              <button
                key={lvl}
                onClick={() => set({ level: lvl })}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 9,
                  border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.07)'}`,
                  background: active ? c.bg : 'transparent',
                  color: active ? c.text : 'rgba(255,255,255,0.2)',
                  fontSize: 9, ...MONO, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
                }}
              >
                {lvl}
              </button>
            )
          })}
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

      {/* Tags */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Tags</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AVAILABLE_TAGS.map(tag => {
            const active = form.tags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: `1px solid ${active ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(251,191,36,0.1)' : 'transparent',
                  color: active ? GOLD : 'rgba(255,255,255,0.25)',
                  fontSize: 9, ...MONO, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer',
                }}
              >
                {tag}
              </button>
            )
          })}
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
      setForm(parseCardMeta(existingProduct))
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
