import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'
import type { Category } from 'floramini-types'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CollabStats {
  totalAmount: number
  totalPlatformFee: number
  totalSales: number
  productCount: number
  recentEarnings: Array<{
    id: number; amount: number; platformFee: number; createdAt: string
    orderItem: { quantity: number; unitPrice: number; product: { name: string; imageUrl: string } }
    order: { createdAt: string }
  }>
  byMonth: Record<string, number>
  topProducts: Array<{ id: number; name: string; imageUrl: string; salesCount: number }>
}

interface CollabProduct {
  id: number; name: string; description: string; price: number; stock: number
  imageUrl: string; isActive: boolean; categoryId: number; collaboratorId: number | null
}

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'

interface CardForm {
  bin: string; bank: string; level: CardLevel; prix: string; stock: string
  cp: string; age: string; tags: string[]; categoryId: number
}

// ── Design tokens ─────────────────────────────────────────────────────────────
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
    return { bin: m.bin ?? '', bank: m.bank ?? '', level: m.level ?? 'CLASSIC', prix: String(p.price), stock: String(p.stock), cp: m.cp ?? '', age: m.age ?? '', tags: m.tags ?? [], categoryId: p.categoryId }
  } catch {
    return { ...emptyCardForm(), prix: String(p.price), stock: String(p.stock), categoryId: p.categoryId }
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

// ── Card form component ────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* BIN + Bank */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>BIN (6 chiffres)</div>
          <input style={INPUT_STYLE} value={form.bin} onChange={e => set({ bin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="456789" inputMode="numeric" maxLength={6} />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Banque</div>
          <input style={INPUT_STYLE} value={form.bank} onChange={e => set({ bank: e.target.value })} placeholder="BNP Paribas" />
        </div>
      </div>

      {/* BIN preview */}
      {form.bin.length >= 6 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'rgba(251,191,36,0.04)', borderRadius: 9, border: '1px solid rgba(251,191,36,0.1)' }}>
          <img src={`https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png`} alt="" style={{ width: 46, height: 29, objectFit: 'cover', borderRadius: 4 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span style={{ fontSize: 9, color: 'rgba(251,191,36,0.5)', ...MONO }}>IMAGE AUTO · {form.bin.slice(0, 6)}</span>
        </div>
      )}

      {/* Niveau */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Niveau</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {LEVELS.map(lvl => {
            const c = LEVEL_COLORS[lvl]
            const active = form.level === lvl
            return (
              <button key={lvl} onClick={() => set({ level: lvl })} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.07)'}`, background: active ? c.bg : 'transparent', color: active ? c.text : 'rgba(255,255,255,0.2)', fontSize: 9, ...MONO, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                {lvl}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prix + Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Prix (€)</div>
          <input style={INPUT_STYLE} type="number" value={form.prix} onChange={e => set({ prix: e.target.value })} placeholder="49.99" inputMode="decimal" />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Stock</div>
          <input style={INPUT_STYLE} type="number" value={form.stock} onChange={e => set({ stock: e.target.value })} placeholder="1" inputMode="numeric" />
        </div>
      </div>

      {/* CP + Âge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Code Postal</div>
          <input style={INPUT_STYLE} value={form.cp} onChange={e => set({ cp: e.target.value })} placeholder="75001" />
        </div>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Âge titulaire</div>
          <input style={INPUT_STYLE} value={form.age} onChange={e => set({ age: e.target.value })} placeholder="35" inputMode="numeric" />
        </div>
      </div>

      {/* Tags */}
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Tags</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AVAILABLE_TAGS.map(tag => {
            const active = form.tags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(251,191,36,0.1)' : 'transparent', color: active ? GOLD : 'rgba(255,255,255,0.25)', fontSize: 9, ...MONO, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Catégorie */}
      {categories.length > 0 && (
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Catégorie</div>
          <select style={{ ...INPUT_STYLE, appearance: 'none' as any }} value={form.categoryId} onChange={e => set({ categoryId: Number(e.target.value) })}>
            <option value={0}>— Aucune —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function CollabDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/'), [navigate]))

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<CardForm>(emptyCardForm())
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CardForm>(emptyCardForm())

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<CollabStats>({
    queryKey: ['collab-stats'],
    queryFn: () => api.get('/api/collab/stats').then(r => r.data),
    staleTime: 30_000,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery<CollabProduct[]>({
    queryKey: ['collab-products'],
    queryFn: () => api.get('/api/collab/products').then(r => r.data),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createProduct = useMutation({
    mutationFn: (body: object) => api.post('/api/collab/products', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      setAddForm(emptyCardForm())
      setShowAddForm(false)
      setAddError(null)
    },
    onError: (err: any) => setAddError(err?.response?.data?.message ?? 'Erreur lors de la création.'),
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      api.put(`/api/collab/products/${id}`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      setEditingId(null)
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: number) => api.delete(`/api/collab/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      setConfirmDelete(null)
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function startEdit(p: CollabProduct) {
    setEditingId(p.id)
    setEditForm(parseCardMeta(p))
  }

  function submitAdd() {
    if (!addForm.bin || !addForm.bank || !addForm.prix) {
      setAddError('BIN, banque et prix sont requis.')
      return
    }
    createProduct.mutate(buildProductPayload(addForm))
  }

  function submitEdit(id: number) {
    updateProduct.mutate({ id, body: buildProductPayload(editForm) })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MON TABLEAU DE BORD</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Stats */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 12px 10px' }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>STATISTIQUES</div>
          {statsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, height: 64, opacity: 0.5 }} />)}
            </div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatCard label="MES GAINS" value={`€${stats.totalAmount.toFixed(2)}`} gold big />
              <StatCard label="VENTES" value={String(stats.totalSales)} />
              <StatCard label="PRODUITS ACTIFS" value={String(stats.productCount)} />
              <StatCard label="PLATEFORME" value={`€${stats.totalPlatformFee.toFixed(2)}`} dim />
            </div>
          ) : null}
        </div>

        {/* My cards */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px' }}>
            <div style={{ ...LABEL_STYLE }}>MES CARTES</div>
          </div>

          {productsLoading ? (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1].map(i => <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, height: 72, opacity: 0.5 }} />)}
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '12px 14px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 12, ...MONO }}>Aucune carte pour l'instant.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {products.map((p, idx) => {
                const meta = parseCardMeta(p)
                const lc = LEVEL_COLORS[meta.level] ?? LEVEL_COLORS.CLASSIC
                return (
                  <div key={p.id}>
                    {idx > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 14px' }} />}

                    {editingId === p.id ? (
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: idx > 0 ? undefined : '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ ...LABEL_STYLE, color: GOLD }}>MODIFIER LA CARTE</div>
                        <CardFormFields form={editForm} onChange={setEditForm} categories={categories} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => submitEdit(p.id)} disabled={updateProduct.isPending} style={{ flex: 1, background: updateProduct.isPending ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', borderRadius: 9, padding: '10px', ...BEBAS, fontSize: 13, letterSpacing: '0.08em', cursor: updateProduct.isPending ? 'not-allowed' : 'pointer' }}>
                            {updateProduct.isPending ? '...' : 'SAUVEGARDER'}
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 9, padding: '10px 14px', ...BEBAS, fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer' }}>
                            ANNULER
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Thumbnail */}
                        <div style={{ width: 52, height: 33, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : null}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <span style={{ color: p.isActive ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.bank || p.name}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4, background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`, ...MONO, letterSpacing: '0.06em', flexShrink: 0 }}>{meta.level}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ ...MONO, fontSize: 11, color: GOLD }}>€{Number(p.price).toFixed(2)}</span>
                            {meta.bin && <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>BIN {meta.bin}</span>}
                            <span style={{ ...MONO, fontSize: 9, color: p.stock > 0 ? SUCCESS : DANGER, background: p.stock > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${p.stock > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 4, padding: '1px 5px' }}>
                              {p.stock > 0 ? `×${p.stock}` : 'ÉPUISÉ'}
                            </span>
                          </div>
                        </div>
                        {/* Actions */}
                        {confirmDelete === p.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div style={{ ...LABEL_STYLE, color: DANGER }}>CONFIRMER ?</div>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button onClick={() => deleteProduct.mutate(p.id)} disabled={deleteProduct.isPending} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: DANGER, borderRadius: 7, padding: '5px 10px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>{deleteProduct.isPending ? '...' : 'OUI'}</button>
                              <button onClick={() => setConfirmDelete(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 7, padding: '5px 10px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>NON</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => startEdit(p)} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: GOLD, borderRadius: 7, padding: '5px 10px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>MODIFIER</button>
                            <button onClick={() => setConfirmDelete(p.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: DANGER, borderRadius: 7, padding: '5px 10px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>SUPPR.</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add card */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <button onClick={() => { setShowAddForm(v => !v); setAddError(null) }} style={{ width: '100%', background: 'none', border: 'none', padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: showAddForm ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 14, lineHeight: 1 }}>{showAddForm ? '−' : '+'}</div>
              <span style={{ ...BEBAS, fontSize: 14, letterSpacing: '0.08em', color: showAddForm ? GOLD : 'rgba(255,255,255,0.7)' }}>AJOUTER UNE CARTE</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{showAddForm ? '▲' : '▼'}</span>
          </button>

          {showAddForm && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ height: 12 }} />
              <CardFormFields form={addForm} onChange={setAddForm} categories={categories} />

              {addError && (
                <div style={{ marginTop: 8, fontSize: 12, ...MONO, color: DANGER, padding: '6px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7 }}>
                  {addError}
                </div>
              )}

              <button onClick={submitAdd} disabled={createProduct.isPending} style={{ width: '100%', marginTop: 12, background: createProduct.isPending ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', borderRadius: 9, padding: '11px', ...BEBAS, fontSize: 14, letterSpacing: '0.1em', cursor: createProduct.isPending ? 'not-allowed' : 'pointer' }}>
                {createProduct.isPending ? '...' : 'AJOUTER LA CARTE'}
              </button>
            </div>
          )}
        </div>

        {/* Top products */}
        {stats && stats.topProducts.length > 0 && (
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 0 12px' }}>
            <div style={{ ...LABEL_STYLE, padding: '0 14px', marginBottom: 10 }}>TOP PRODUITS</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 14px', scrollbarWidth: 'none' }}>
              {stats.topProducts.map(p => (
                <div key={p.id} style={{ flexShrink: 0, width: 90, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: 56, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
                  </div>
                  <div style={{ padding: '6px 7px 7px' }}>
                    <div style={{ color: '#fff', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{p.name}</div>
                    <div style={{ ...MONO, fontSize: 9, color: GOLD }}>{p.salesCount} vente{p.salesCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, gold, dim, big }: { label: string; value: string; gold?: boolean; dim?: boolean; big?: boolean }) {
  return (
    <div style={{ background: gold ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.03)', border: gold ? '1px solid rgba(251,191,36,0.15)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 11px' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.22em', color: gold ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: big ? 28 : 22, letterSpacing: '0.04em', color: gold ? '#fbbf24' : dim ? 'rgba(255,255,255,0.3)' : '#fff', lineHeight: 1 }}>{value}</div>
    </div>
  )
}
