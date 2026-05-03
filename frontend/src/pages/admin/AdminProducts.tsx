import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Product, Category } from 'floramini-types'

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'

interface CardMeta {
  bin: string
  bank: string
  level: CardLevel
  cp: string
  age: string
  tags: string[]
}

interface ProductForm {
  bin: string
  bank: string
  level: CardLevel
  prix: string
  stock: string
  cp: string
  age: string
  tags: string[]
  categoryId: number
  isActive: boolean
}

interface InventoryStats {
  total: number
  unsold: number
  sold: number
}

const AVAILABLE_TAGS = ['CREDIT', 'DEBIT', 'IPHONE', 'ANDROID', 'AMELI']
const LEVELS: CardLevel[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']

const LEVEL_COLORS: Record<CardLevel, { bg: string; text: string; border: string }> = {
  CLASSIC: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', border: 'rgba(156,163,175,0.3)' },
  GOLD: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.4)' },
  PLATINUM: { bg: 'rgba(229,231,235,0.15)', text: '#e5e7eb', border: 'rgba(229,231,235,0.35)' },
  BLACK: { bg: 'rgba(255,255,255,0.08)', text: '#fff', border: 'rgba(255,255,255,0.2)' },
}

const emptyForm = (): ProductForm => ({
  bin: '', bank: '', level: 'CLASSIC', prix: '', stock: '',
  cp: '', age: '', tags: [], categoryId: 0, isActive: true,
})

function parseCardMeta(p: Product): CardMeta {
  try {
    const m = JSON.parse(p.description || '{}')
    return { bin: m.bin ?? '', bank: m.bank ?? '', level: m.level ?? 'CLASSIC', cp: m.cp ?? '', age: m.age ?? '', tags: m.tags ?? [] }
  } catch {
    return { bin: '', bank: '', level: 'CLASSIC', cp: '', age: '', tags: [] }
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 13,
  fontFamily: '"JetBrains Mono",monospace', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 8, fontWeight: 700, letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace',
  textTransform: 'uppercase', marginBottom: 5, display: 'block',
}

// ── InventoryPanel component ───────────────────────────────────────────────────
function InventoryPanel({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [uploadResult, setUploadResult] = useState<{ added: number; stock: number } | null>(null)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  const { data: inv, isLoading } = useQuery<InventoryStats>({
    queryKey: ['admin-inventory', productId],
    queryFn: () => api.get(`/api/admin/products/${productId}/inventory`).then(r => r.data),
    staleTime: 30_000,
  })

  const validLines = text.split('\n').filter(l => /^\d{13,19}/.test(l.trim()))

  const uploadMutation = useMutation({
    mutationFn: () => api.post(`/api/admin/products/${productId}/inventory/bulk`, {
      lines: text.split('\n').filter(l => l.trim()),
    }).then(r => r.data),
    onSuccess: (data) => {
      setUploadResult(data)
      setUploadErr(null)
      setText('')
      queryClient.invalidateQueries({ queryKey: ['admin-inventory', productId] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
    onError: (e: any) => setUploadErr(e?.response?.data?.error ?? 'Erreur upload'),
  })

  const clearMutation = useMutation({
    mutationFn: () => api.delete(`/api/admin/products/${productId}/inventory`).then(r => r.data),
    onSuccess: () => {
      setClearConfirm(false)
      setUploadResult(null)
      queryClient.invalidateQueries({ queryKey: ['admin-inventory', productId] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
  })

  return (
    <div style={{ padding: '10px 12px 12px', borderTop: '1px solid rgba(251,191,36,0.08)', background: 'rgba(251,191,36,0.015)' }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(251,191,36,0.45)', fontFamily: '"JetBrains Mono",monospace', textTransform: 'uppercase', marginBottom: 8 }}>
        INVENTAIRE CC
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div style={{ height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 5, marginBottom: 8, opacity: 0.5 }} />
      ) : inv ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', padding: '4px 9px', borderRadius: 5, background: inv.unsold > 0 ? 'rgba(74,222,128,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${inv.unsold > 0 ? 'rgba(74,222,128,0.18)' : 'rgba(239,68,68,0.18)'}`, color: inv.unsold > 0 ? 'rgba(74,222,128,0.9)' : 'rgba(239,68,68,0.7)' }}>
            {inv.unsold} dispo
          </div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', padding: '4px 9px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
            {inv.sold} vendues
          </div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', padding: '4px 9px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' }}>
            {inv.total} total
          </div>
        </div>
      ) : null}

      {/* Format hint */}
      <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(255,255,255,0.18)', marginBottom: 6 }}>
        Format: 4567890123456789|12/26|123|John Doe|75 Rue de Rivoli|75001|France
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setUploadResult(null) }}
        placeholder={'4111111111111111|12/26|123|Jean Dupont|75001|France\n5500005555555559|01/27|456|Marie Martin|69001|France'}
        style={{
          width: '100%', minHeight: 80, background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
          color: '#fff', fontSize: 11, fontFamily: '"JetBrains Mono",monospace',
          padding: '8px 10px', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Valid lines count + upload button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: validLines.length > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.2)' }}>
          {validLines.length} ligne{validLines.length !== 1 ? 's' : ''} valide{validLines.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* VIDER STOCK */}
          {inv && inv.unsold > 0 && (
            clearConfirm ? (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(239,68,68,0.7)' }}>Vider ?</span>
                <button
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, cursor: 'pointer' }}
                >
                  {clearMutation.isPending ? '...' : 'OUI'}
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}
                >
                  NON
                </button>
              </div>
            ) : (
              <button
                onClick={() => setClearConfirm(true)}
                style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}
              >
                VIDER STOCK
              </button>
            )
          )}
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending || validLines.length === 0}
            style={{ padding: '5px 12px', borderRadius: 6, background: validLines.length > 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${validLines.length > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`, color: validLines.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.08em', cursor: uploadMutation.isPending || validLines.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            {uploadMutation.isPending ? '...' : 'UPLOAD'}
          </button>
        </div>
      </div>

      {/* Results */}
      {uploadResult && (
        <div style={{ marginTop: 7, fontSize: 10, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(74,222,128,0.9)', padding: '5px 9px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 6 }}>
          +{uploadResult.added} carte{uploadResult.added !== 1 ? 's' : ''} · stock: {uploadResult.stock}
        </div>
      )}
      {uploadErr && (
        <div style={{ marginTop: 7, fontSize: 10, fontFamily: '"JetBrains Mono",monospace', color: '#ef4444', padding: '5px 9px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
          {uploadErr}
        </div>
      )}
    </div>
  )
}

// ── ProductCard with inventory section ────────────────────────────────────────
function ProductCard({
  p, onEdit, confirmDelete, onConfirmDelete, onCancelDelete, onDelete, deleting,
}: {
  p: Product
  onEdit: () => void
  confirmDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const meta = parseCardMeta(p)
  const lc = LEVEL_COLORS[meta.level] ?? LEVEL_COLORS.CLASSIC
  const [showInventory, setShowInventory] = useState(false)

  const { data: inv } = useQuery<InventoryStats>({
    queryKey: ['admin-inventory', p.id],
    queryFn: () => api.get(`/api/admin/products/${p.id}/inventory`).then(r => r.data),
    staleTime: 30_000,
  })

  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
        {/* Card image */}
        <div style={{ width: 52, height: 33, borderRadius: 6, overflow: 'hidden', background: '#1a1a1a', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
          {meta.bin ? (
            <img src={`https://cardimages.imaginecurve.com/cards/${meta.bin.slice(0, 6)}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : null}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.isActive ? '#fff' : 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.03em' }}>{meta.bank || p.name}</span>
            <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.06em' }}>{meta.level}</span>
            {!p.isActive && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>OFF</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace' }}>€{Number(p.price).toFixed(2)}</span>
            {meta.bin && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace' }}>BIN {meta.bin}</span>}
            {inv ? (
              <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: inv.unsold > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(239,68,68,0.6)' }}>
                {inv.unsold} dispo · {inv.sold} vendues
              </span>
            ) : (
              <span style={{ fontSize: 9, color: p.stock > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(239,68,68,0.6)', fontFamily: '"JetBrains Mono",monospace' }}>{p.stock > 0 ? `×${p.stock}` : 'ÉPUISÉ'}</span>
            )}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={onEdit} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 10, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>EDIT</button>
            <button onClick={onConfirmDelete} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 10, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>✕</button>
          </div>
          <button
            onClick={() => setShowInventory(v => !v)}
            style={{ padding: '4px 10px', borderRadius: 7, background: showInventory ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showInventory ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'}`, color: showInventory ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}
          >
            INVENTAIRE
          </button>
        </div>
      </div>

      {/* Tags row */}
      {meta.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '0 12px 8px', flexWrap: 'wrap' }}>
          {meta.tags.map(t => <span key={t} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', border: '1px solid rgba(255,255,255,0.06)' }}>{t}</span>)}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.8)', fontFamily: '"JetBrains Mono",monospace' }}>SUPPRIMER DÉFINITIVEMENT ?</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCancelDelete} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>NON</button>
            <button onClick={onDelete} disabled={deleting} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 10, fontFamily: '"JetBrains Mono",monospace', cursor: 'pointer' }}>{deleting ? '...' : 'OUI'}</button>
          </div>
        </div>
      )}

      {/* Inventory panel */}
      {showInventory && <InventoryPanel productId={p.id} />}
    </div>
  )
}

export default function AdminProducts() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: () => api.get('/api/admin/products').then(r => r.data),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
  })

  const saveProduct = useMutation({
    mutationFn: () => {
      const meta: CardMeta = { bin: form.bin, bank: form.bank, level: form.level, cp: form.cp, age: form.age, tags: form.tags }
      const body = {
        name: `${form.bank} ${form.level}`,
        description: JSON.stringify(meta),
        price: parseFloat(form.prix),
        stock: parseInt(form.stock),
        categoryId: Number(form.categoryId) || null,
        imageUrl: form.bin.length >= 6 ? `https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png` : '',
        isActive: form.isActive,
        images: [],
      }
      return editingId ? api.put(`/api/admin/products/${editingId}`, body) : api.post('/api/admin/products', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setConfirmDelete(null)
    },
  })

  function startEdit(p: Product) {
    const meta = parseCardMeta(p)
    setEditingId(p.id)
    setForm({ bin: meta.bin, bank: meta.bank, level: meta.level, prix: String(p.price), stock: String(p.stock), cp: meta.cp, age: meta.age, tags: meta.tags, categoryId: p.categoryId ?? 0, isActive: p.isActive })
    setShowForm(true)
    setTimeout(() => document.getElementById('products-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function toggleTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/admin')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
          <div>
            <div style={{ fontFamily: '"Bebas Neue","Impact",sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>CATALOGUE</div>
            <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>{products.length} CARTES</div>
          </div>
        </div>
        <button onClick={() => { setEditingId(null); setForm(emptyForm()); setShowForm(s => !s) }} style={{ height: 32, paddingInline: 14, borderRadius: 9, border: '1px solid rgba(251,191,36,0.4)', background: showForm && !editingId ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.08)', color: '#fbbf24', cursor: 'pointer', fontSize: 11, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.1em' }}>
          {showForm && !editingId ? '✕ ANNULER' : '+ AJOUTER'}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Form */}
        {showForm && (
          <div id="products-form" style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace', marginBottom: 2 }}>
              {editingId ? '· MODIFIER LA CARTE' : '· NOUVELLE CARTE'}
            </div>

            {/* BIN + Bank row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>BIN (6 chiffres)</label>
                <input style={inputStyle} value={form.bin} onChange={e => setForm(f => ({ ...f, bin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} placeholder="456789" maxLength={6} inputMode="numeric" />
              </div>
              <div>
                <label style={labelStyle}>Banque</label>
                <input style={inputStyle} value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} placeholder="BNP Paribas" />
              </div>
            </div>

            {/* BIN preview */}
            {form.bin.length >= 6 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(251,191,36,0.05)', borderRadius: 9, border: '1px solid rgba(251,191,36,0.1)' }}>
                <img src={`https://cardimages.imaginecurve.com/cards/${form.bin.slice(0, 6)}.png`} alt="" style={{ width: 48, height: 30, objectFit: 'cover', borderRadius: 4 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontSize: 9, color: 'rgba(251,191,36,0.6)', fontFamily: '"JetBrains Mono",monospace' }}>IMAGE AUTO · {form.bin.slice(0, 6)}</span>
              </div>
            )}

            {/* Level */}
            <div>
              <label style={labelStyle}>Niveau</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEVELS.map(lvl => {
                  const c = LEVEL_COLORS[lvl]
                  const active = form.level === lvl
                  return (
                    <button key={lvl} onClick={() => setForm(f => ({ ...f, level: lvl }))} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.07)'}`, background: active ? c.bg : 'transparent', color: active ? c.text : 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
                      {lvl}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Prix + Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Prix (€)</label>
                <input style={inputStyle} type="number" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} placeholder="49.99" inputMode="decimal" />
              </div>
              <div>
                <label style={labelStyle}>Stock</label>
                <input style={inputStyle} type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="10" inputMode="numeric" />
              </div>
            </div>

            {/* CP + Age */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Code Postal</label>
                <input style={inputStyle} value={form.cp} onChange={e => setForm(f => ({ ...f, cp: e.target.value }))} placeholder="75001" />
              </div>
              <div>
                <label style={labelStyle}>Âge titulaire</label>
                <input style={inputStyle} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="35" inputMode="numeric" />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>Tags</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AVAILABLE_TAGS.map(tag => {
                  const active = form.tags.includes(tag)
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(251,191,36,0.12)' : 'transparent', color: active ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))}>
                <option value={0}>— Aucune —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Active toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#1a1a1a', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: '"JetBrains Mono",monospace' }}>CARTE ACTIVE</span>
              <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))} style={{ width: 42, height: 22, borderRadius: 11, background: form.isActive ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)', border: `1px solid ${form.isActive ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: form.isActive ? '#fbbf24' : 'rgba(255,255,255,0.3)', position: 'absolute', top: 2, left: form.isActive ? 22 : 2, transition: 'all 0.2s' }} />
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button onClick={() => saveProduct.mutate()} disabled={saveProduct.isPending || !form.bin || !form.bank || !form.prix} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: saveProduct.isPending ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}>
                {saveProduct.isPending ? 'SAUVEGARDE...' : editingId ? 'MODIFIER' : 'AJOUTER'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()) }} style={{ padding: '11px 16px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Product list */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: '#111', opacity: 0.5 }} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
            AUCUNE CARTE
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {products.map(p => (
              <ProductCard
                key={p.id}
                p={p}
                onEdit={() => startEdit(p)}
                confirmDelete={confirmDelete === p.id}
                onConfirmDelete={() => setConfirmDelete(p.id)}
                onCancelDelete={() => setConfirmDelete(null)}
                onDelete={() => deleteProduct.mutate(p.id)}
                deleting={deleteProduct.isPending && confirmDelete === p.id}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); select option { background: #1a1a1a; color: #fff; } textarea { resize: vertical; } textarea::placeholder { color: rgba(255,255,255,0.15); }`}</style>
    </div>
  )
}
