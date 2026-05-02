import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'

// ── Inlined types ────────────────────────────────────────────────────────────
interface CollabStats {
  totalAmount: number
  totalPlatformFee: number
  totalSales: number
  productCount: number
  recentEarnings: Array<{
    id: number
    amount: number
    platformFee: number
    createdAt: string
    orderItem: { quantity: number; unitPrice: number; product: { name: string; imageUrl: string } }
    order: { createdAt: string }
  }>
  byMonth: Record<string, number>
  topProducts: Array<{ id: number; name: string; imageUrl: string; salesCount: number }>
}

interface CollabProduct {
  id: number
  name: string
  description: string
  price: number
  stock: number
  imageUrl: string
  isActive: boolean
  categoryId: number
  collaboratorId: number | null
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG = '#050505'
const CARD_BG = '#111'
const CARD_BORDER = '1px solid rgba(255,255,255,0.07)'
const GOLD = '#fbbf24'
const SECONDARY_TEXT = 'rgba(255,255,255,0.3)'
const DANGER = '#ef4444'
const SUCCESS = '#4ade80'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 8,
  letterSpacing: '0.22em',
  color: 'rgba(255,255,255,0.22)',
  fontFamily: '"JetBrains Mono", monospace',
  textTransform: 'uppercase' as const,
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9,
  padding: '9px 12px',
  color: '#fff',
  fontSize: 13,
  fontFamily: '"JetBrains Mono", monospace',
  outline: 'none',
}

// ── Add form state ─────────────────────────────────────────────────────────────
interface AddForm {
  name: string
  description: string
  price: string
  stock: string
  categoryId: string
  imageUrl: string
}

const emptyAddForm = (): AddForm => ({
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
  imageUrl: '',
})

interface EditForm {
  name: string
  price: string
  stock: string
  description: string
  imageUrl: string
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function CollabDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/'), [navigate]))

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm())
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', price: '', stock: '', description: '', imageUrl: '' })

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery<CollabStats>({
    queryKey: ['collab-stats'],
    queryFn: () => api.get('/api/collab/stats').then((r) => r.data),
    staleTime: 30 * 1000,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery<CollabProduct[]>({
    queryKey: ['collab-products'],
    queryFn: () => api.get('/api/collab/products').then((r) => r.data),
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createProduct = useMutation({
    mutationFn: (body: object) => api.post('/api/collab/products', body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      setAddForm(emptyAddForm())
      setShowAddForm(false)
      setAddError(null)
    },
    onError: (err: any) => {
      setAddError(err?.response?.data?.message ?? 'Erreur lors de la création.')
    },
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      api.put(`/api/collab/products/${id}`, body).then((r) => r.data),
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
    setEditForm({
      name: p.name,
      price: String(p.price),
      stock: String(p.stock),
      description: p.description,
      imageUrl: p.imageUrl,
    })
  }

  function submitAdd() {
    if (!addForm.name.trim() || !addForm.price || !addForm.categoryId) {
      setAddError('Nom, prix et catégorie sont requis.')
      return
    }
    createProduct.mutate({
      name: addForm.name.trim(),
      description: addForm.description.trim(),
      price: parseFloat(addForm.price),
      stock: parseInt(addForm.stock) || 0,
      categoryId: parseInt(addForm.categoryId),
      imageUrl: addForm.imageUrl.trim(),
    })
  }

  function submitEdit(id: number) {
    updateProduct.mutate({
      id,
      body: {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock),
        imageUrl: editForm.imageUrl.trim(),
      },
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: BG }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.95)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border: '1px solid rgba(251,191,36,0.2)',
            background: 'rgba(251,191,36,0.08)',
            color: 'rgba(251,191,36,0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
          }}
          aria-label="Retour"
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{
            ...BEBAS,
            fontSize: 20,
            letterSpacing: '0.06em',
            color: '#fff',
            lineHeight: 1,
          }}>
            MON TABLEAU DE BORD
          </div>
        </div>
        {/* Gold dot indicator */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: GOLD,
          boxShadow: `0 0 6px ${GOLD}`,
        }} />
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '12px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>

        {/* ── STATS GRID ── */}
        <div style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 14,
          padding: '12px 12px 10px',
        }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>STATISTIQUES</div>
          {statsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  height: 64,
                  opacity: 0.5,
                }} />
              ))}
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

        {/* ── MES CARTES ── */}
        <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 8px' }}>
            <div style={{ ...LABEL_STYLE }}>MES CARTES</div>
          </div>

          {productsLoading ? (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  height: 72,
                  opacity: 0.5,
                }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '12px 14px 16px', color: SECONDARY_TEXT, fontSize: 12, ...MONO }}>
              Aucune carte pour l'instant.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {products.map((p, idx) => (
                <div key={p.id}>
                  {idx > 0 && (
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 14px' }} />
                  )}

                  {editingId === p.id ? (
                    /* ── Inline edit form ── */
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ ...LABEL_STYLE, color: GOLD }}>MODIFIER LA CARTE</div>
                      <input
                        style={INPUT_STYLE}
                        placeholder="Nom"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <input
                          style={INPUT_STYLE}
                          type="number"
                          placeholder="Prix €"
                          value={editForm.price}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                        />
                        <input
                          style={INPUT_STYLE}
                          type="number"
                          placeholder="Stock"
                          value={editForm.stock}
                          onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                        />
                      </div>
                      <input
                        style={INPUT_STYLE}
                        placeholder="URL image"
                        value={editForm.imageUrl}
                        onChange={(e) => setEditForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      />
                      <textarea
                        style={{ ...INPUT_STYLE, resize: 'none', minHeight: 64 } as React.CSSProperties}
                        placeholder="Description"
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => submitEdit(p.id)}
                          disabled={updateProduct.isPending}
                          style={{
                            flex: 1,
                            background: updateProduct.isPending ? 'rgba(251,191,36,0.3)' : GOLD,
                            color: '#050505',
                            border: 'none',
                            borderRadius: 9,
                            padding: '9px',
                            ...BEBAS,
                            fontSize: 13,
                            letterSpacing: '0.08em',
                            cursor: updateProduct.isPending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {updateProduct.isPending ? '...' : 'SAUVEGARDER'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.5)',
                            borderRadius: 9,
                            padding: '9px 14px',
                            ...BEBAS,
                            fontSize: 13,
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                          }}
                        >
                          ANNULER
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Product row ── */
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Thumbnail */}
                      <div style={{
                        width: 46,
                        height: 29,
                        borderRadius: 6,
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.06)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                      }}>
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '🃏'
                        }
                      </div>

                      {/* Name + price */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: p.isActive ? '#fff' : SECONDARY_TEXT,
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                        }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ ...MONO, fontSize: 11, color: GOLD }}>
                            €{p.price.toFixed(2)}
                          </span>
                          <span style={{
                            ...MONO,
                            fontSize: 9,
                            color: p.stock > 0 ? SUCCESS : DANGER,
                            background: p.stock > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                            border: `1px solid ${p.stock > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: 4,
                            padding: '1px 5px',
                          }}>
                            {p.stock > 0 ? `×${p.stock}` : 'ÉPUISÉ'}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons / confirm delete */}
                      {confirmDelete === p.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{ ...LABEL_STYLE, color: DANGER }}>CONFIRMER ?</div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              onClick={() => deleteProduct.mutate(p.id)}
                              disabled={deleteProduct.isPending}
                              style={{
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.35)',
                                color: DANGER,
                                borderRadius: 7,
                                padding: '5px 10px',
                                fontSize: 10,
                                ...BEBAS,
                                letterSpacing: '0.06em',
                                cursor: deleteProduct.isPending ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {deleteProduct.isPending ? '...' : 'OUI'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.5)',
                                borderRadius: 7,
                                padding: '5px 10px',
                                fontSize: 10,
                                ...BEBAS,
                                letterSpacing: '0.06em',
                                cursor: 'pointer',
                              }}
                            >
                              NON
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => startEdit(p)}
                            style={{
                              background: 'rgba(251,191,36,0.08)',
                              border: '1px solid rgba(251,191,36,0.2)',
                              color: GOLD,
                              borderRadius: 7,
                              padding: '5px 10px',
                              fontSize: 10,
                              ...BEBAS,
                              letterSpacing: '0.06em',
                              cursor: 'pointer',
                            }}
                          >
                            MODIFIER
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              color: DANGER,
                              borderRadius: 7,
                              padding: '5px 10px',
                              fontSize: 10,
                              ...BEBAS,
                              letterSpacing: '0.06em',
                              cursor: 'pointer',
                            }}
                          >
                            SUPPRIMER
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ADD CARD (expandable) ── */}
        <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, overflow: 'hidden' }}>
          <button
            onClick={() => { setShowAddForm((v) => !v); setAddError(null) }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '13px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: showAddForm ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: GOLD,
                fontSize: 14,
                lineHeight: 1,
              }}>
                {showAddForm ? '−' : '+'}
              </div>
              <span style={{
                ...BEBAS,
                fontSize: 14,
                letterSpacing: '0.08em',
                color: showAddForm ? GOLD : 'rgba(255,255,255,0.7)',
              }}>
                AJOUTER UNE CARTE
              </span>
            </div>
            <span style={{ color: SECONDARY_TEXT, fontSize: 12 }}>
              {showAddForm ? '▲' : '▼'}
            </span>
          </button>

          {showAddForm && (
            <div style={{
              padding: '0 14px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ height: 10 }} />
              <input
                style={INPUT_STYLE}
                placeholder="Nom de la carte"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <input
                  style={INPUT_STYLE}
                  type="number"
                  placeholder="Prix €"
                  value={addForm.price}
                  onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                />
                <input
                  style={INPUT_STYLE}
                  type="number"
                  placeholder="Stock"
                  value={addForm.stock}
                  onChange={(e) => setAddForm((f) => ({ ...f, stock: e.target.value }))}
                />
                <input
                  style={INPUT_STYLE}
                  type="number"
                  placeholder="Cat. ID"
                  value={addForm.categoryId}
                  onChange={(e) => setAddForm((f) => ({ ...f, categoryId: e.target.value }))}
                />
              </div>
              <input
                style={INPUT_STYLE}
                placeholder="URL image"
                value={addForm.imageUrl}
                onChange={(e) => setAddForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
              <textarea
                style={{ ...INPUT_STYLE, resize: 'none', minHeight: 72 } as React.CSSProperties}
                placeholder="Description"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              />

              {addError && (
                <div style={{
                  fontSize: 12,
                  ...MONO,
                  color: DANGER,
                  padding: '6px 10px',
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 7,
                }}>
                  {addError}
                </div>
              )}

              <button
                onClick={submitAdd}
                disabled={createProduct.isPending}
                style={{
                  background: createProduct.isPending ? 'rgba(251,191,36,0.3)' : GOLD,
                  color: '#050505',
                  border: 'none',
                  borderRadius: 9,
                  padding: '11px',
                  ...BEBAS,
                  fontSize: 14,
                  letterSpacing: '0.1em',
                  cursor: createProduct.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {createProduct.isPending ? '...' : 'AJOUTER LA CARTE'}
              </button>
            </div>
          )}
        </div>

        {/* ── TOP PRODUCTS ── */}
        {stats && stats.topProducts.length > 0 && (
          <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: '12px 0 12px' }}>
            <div style={{ ...LABEL_STYLE, padding: '0 14px', marginBottom: 10 }}>TOP PRODUITS</div>
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              padding: '0 14px',
              scrollbarWidth: 'none',
            }}>
              {stats.topProducts.map((p) => (
                <div key={p.id} style={{
                  flexShrink: 0,
                  width: 90,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    height: 56,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🃏'
                    }
                  </div>
                  <div style={{ padding: '6px 7px 7px' }}>
                    <div style={{
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 3,
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      ...MONO,
                      fontSize: 9,
                      color: GOLD,
                    }}>
                      {p.salesCount} vente{p.salesCount !== 1 ? 's' : ''}
                    </div>
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
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        textarea { font-family: "JetBrains Mono", monospace; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

// ── Stat card sub-component ────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  gold,
  dim,
  big,
}: {
  label: string
  value: string
  gold?: boolean
  dim?: boolean
  big?: boolean
}) {
  return (
    <div style={{
      background: gold ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.03)',
      border: gold ? '1px solid rgba(251,191,36,0.15)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '10px 11px',
    }}>
      <div style={{
        fontSize: 8,
        letterSpacing: '0.22em',
        color: gold ? 'rgba(251,191,36,0.45)' : 'rgba(255,255,255,0.22)',
        fontFamily: '"JetBrains Mono", monospace',
        textTransform: 'uppercase' as const,
        marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: '"Bebas Neue", "Impact", sans-serif',
        fontSize: big ? 28 : 22,
        letterSpacing: '0.04em',
        color: gold ? '#fbbf24' : dim ? 'rgba(255,255,255,0.3)' : '#fff',
        lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}
