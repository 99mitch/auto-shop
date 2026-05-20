import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CardVisual, CardMetaList, parseCardFull } from '../../components/CardPreview'

interface CardItem {
  id: number
  fullData: string
  sold: boolean
  createdAt: string
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

export default function CollabInventory() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const productId = id ? parseInt(id) : null
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'available' | 'sold'>('all')

  const { data: cards = [], isLoading } = useQuery<CardItem[]>({
    queryKey: ['collab-inventory-list', productId],
    queryFn: () => api.get(`/api/collab/products/${productId}/inventory/list`).then(r => r.data),
    enabled: productId != null,
  })

  const deleteCard = useMutation({
    mutationFn: (cardId: number) => api.delete(`/api/collab/products/${productId}/inventory/${cardId}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-inventory-list', productId] })
      queryClient.invalidateQueries({ queryKey: ['collab-inventory', productId] })
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      setConfirmDelete(null)
    },
    onError: () => setConfirmDelete(null),
  })

  if (productId == null) {
    return <div style={{ padding: 20, color: '#fff' }}>Produit invalide</div>
  }

  const filtered = cards.filter(c => filter === 'all' || (filter === 'available' ? !c.sold : c.sold))
  const totalCount = cards.length
  const availableCount = cards.filter(c => !c.sold).length
  const soldCount = totalCount - availableCount

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/collab')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>ESPACE COLLAB</div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MES CARTES</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
      </div>

      {/* Filtres */}
      <div style={{ flexShrink: 0, padding: '12px 16px 6px', display: 'flex', gap: 6 }}>
        {([['all', `TOUTES (${totalCount})`], ['available', `DISPO (${availableCount})`], ['sold', `VENDUES (${soldCount})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              background: filter === key ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === key ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === key ? GOLD : 'rgba(255,255,255,0.4)',
              fontSize: 9, ...BEBAS, letterSpacing: '0.08em', cursor: 'pointer',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isLoading ? (
          <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 24 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 24 }}>
            {filter === 'all' ? 'Aucune carte dans cet inventaire.' : filter === 'available' ? 'Aucune carte disponible.' : 'Aucune carte vendue.'}
          </div>
        ) : (
          filtered.map((card) => {
            const parsed = parseCardFull(card.fullData)
            const isConfirming = confirmDelete === card.id
            const isDeleting = deleteCard.isPending && confirmDelete === card.id
            return (
              <div key={card.id} style={{ background: '#111', border: `1px solid ${card.sold ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '14px' }}>
                {/* Status header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>#{card.id}</span>
                    {card.sold ? (
                      <span style={{ ...MONO, fontSize: 8, color: DANGER, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.08em' }}>VENDUE</span>
                    ) : (
                      <span style={{ ...MONO, fontSize: 8, color: SUCCESS, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.08em' }}>DISPONIBLE</span>
                    )}
                    <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>{new Date(card.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {!card.sold && !isConfirming && (
                    <button
                      onClick={() => setConfirmDelete(card.id)}
                      style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: DANGER, fontSize: 9, ...BEBAS, letterSpacing: '0.08em', cursor: 'pointer' }}
                    >🗑 SUPPR</button>
                  )}
                  {!card.sold && isConfirming && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => deleteCard.mutate(card.id)}
                        disabled={isDeleting}
                        style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: DANGER, fontSize: 9, ...BEBAS, letterSpacing: '0.08em', cursor: isDeleting ? 'wait' : 'pointer' }}
                      >{isDeleting ? '...' : 'OUI'}</button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        disabled={isDeleting}
                        style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 9, ...BEBAS, letterSpacing: '0.08em', cursor: 'pointer' }}
                      >NON</button>
                    </div>
                  )}
                </div>

                <CardVisual card={parsed} />
                <CardMetaList card={parsed} />
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
