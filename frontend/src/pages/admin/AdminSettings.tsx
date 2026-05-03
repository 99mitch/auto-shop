import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Category } from 'floramini-types'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13,
  fontFamily: '"JetBrains Mono",monospace', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace',
  textTransform: 'uppercase', marginBottom: 5, display: 'block',
}

export default function AdminSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [newCatName, setNewCatName] = useState('')
  const [newCatSlug, setNewCatSlug] = useState('')
  const [editingCat, setEditingCat] = useState<number | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<number | null>(null)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/api/admin/categories').then(r => r.data),
  })

  const addCategory = useMutation({
    mutationFn: () => api.post('/api/admin/categories', { slug: newCatSlug || newCatName.toLowerCase().replace(/\s+/g, '-'), name: newCatName, order: categories.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setNewCatName('')
      setNewCatSlug('')
    },
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.put(`/api/admin/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditingCat(null)
    },
  })

  const deleteCategory = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setConfirmDeleteCat(null)
    },
  })

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/admin')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ fontFamily: '"Bebas Neue","Impact",sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>RÉGLAGES</div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>CONFIG · CATÉGORIES</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Commission info */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', borderLeft: '3px solid rgba(251,191,36,0.6)', padding: '14px 16px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 10 }}>MODÈLE DE COMMISSION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ fontSize: 24, fontFamily: '"Bebas Neue","Impact",sans-serif', color: '#4ade80', letterSpacing: '0.04em', lineHeight: 1 }}>80%</div>
              <div style={{ fontSize: 8, color: 'rgba(74,222,128,0.5)', fontFamily: '"JetBrains Mono",monospace', marginTop: 3 }}>COLLABORATEUR</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '12px', border: '1px solid rgba(251,191,36,0.15)' }}>
              <div style={{ fontSize: 24, fontFamily: '"Bebas Neue","Impact",sans-serif', color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>20%</div>
              <div style={{ fontSize: 8, color: 'rgba(251,191,36,0.5)', fontFamily: '"JetBrains Mono",monospace', marginTop: 3 }}>PLATEFORME</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: '"JetBrains Mono",monospace', marginTop: 10, lineHeight: 1.5 }}>
            Commission calculée et dispatched automatiquement à chaque paiement confirmé.
          </div>
        </div>

        {/* Categories */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 10 }}>CATÉGORIES</div>

            {/* Add form */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nouvelle catégorie..."
                onKeyDown={e => e.key === 'Enter' && newCatName && addCategory.mutate()}
              />
              <button
                onClick={() => newCatName && addCategory.mutate()}
                disabled={!newCatName || addCategory.isPending}
                style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 11, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer', flexShrink: 0 }}
              >
                +
              </button>
            </div>
          </div>

          {/* Category list */}
          {categories.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>AUCUNE CATÉGORIE</div>
          ) : (
            categories.map((cat, i) => (
              <div key={cat.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                {editingCat === cat.id ? (
                  <div style={{ display: 'flex', gap: 6, padding: '8px 14px' }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={editCatName}
                      onChange={e => setEditCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && updateCategory.mutate({ id: cat.id, name: editCatName })}
                      autoFocus
                    />
                    <button onClick={() => updateCategory.mutate({ id: cat.id, name: editCatName })} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 11, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>✓</button>
                    <button onClick={() => setEditingCat(null)} style={{ padding: '10px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono",monospace' }}>{cat.name}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>{cat.slug}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {confirmDeleteCat === cat.id ? (
                        <>
                          <button onClick={() => setConfirmDeleteCat(null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>NON</button>
                          <button onClick={() => deleteCategory.mutate(cat.id)} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>OUI</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name) }} style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.7)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>EDIT</button>
                          <button onClick={() => setConfirmDeleteCat(cat.id)} style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.7)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>✕</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Platform info */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 10 }}>PLATEFORME</div>
          {[
            { label: 'Mode', value: 'FULLZ · DIGITAL ONLY' },
            { label: 'Paiements', value: 'STARS TELEGRAM' },
            { label: 'Livraison', value: 'INSTANTANÉE · BOT' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace' }}>{row.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono",monospace', fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>

      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
    </div>
  )
}
