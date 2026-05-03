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
  imageUrl: string; isActive: boolean; categoryId: number | null; collaboratorId: number | null
}

interface InventoryStats {
  total: number
  unsold: number
  sold: number
}

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

// ── Badge component ────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: { bg: string; text: string; border?: string } }) {
  return (
    <span style={{
      fontSize: 8, padding: '2px 7px', borderRadius: 20,
      background: color.bg, color: color.text,
      fontFamily: '"JetBrains Mono", monospace',
      border: `1px solid ${color.border ?? color.bg}`,
    }}>{label}</span>
  )
}

// ── BulkUpload per-product panel ───────────────────────────────────────────────
function BulkUploadPanel({ productId, onDone }: { productId: number; onDone: () => void }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ added: number; stock: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const validLines = text.split('\n').filter(l => /^\d{13,19}/.test(l.trim()))

  const upload = useMutation({
    mutationFn: () => api.post(`/api/collab/products/${productId}/inventory/bulk`, {
      lines: text.split('\n').filter(l => l.trim()),
    }).then(r => r.data),
    onSuccess: (data) => {
      setResult(data)
      setText('')
      setErr(null)
      onDone()
    },
    onError: (e: any) => setErr(e?.response?.data?.error ?? 'Erreur upload'),
  })

  return (
    <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(251,191,36,0.02)' }}>
      <div style={{ ...LABEL_STYLE, color: 'rgba(251,191,36,0.4)', marginBottom: 7 }}>BULK UPLOAD CC</div>
      <div style={{ fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.2)', marginBottom: 7 }}>
        Format: 4567890123456789|12/26|123|John Doe|75001|France — une ligne par carte
      </div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setResult(null) }}
        placeholder={'4111111111111111|12/26|123|Jean Dupont|75001|France\n5500005555555559|01/27|456|Marie Martin|69001|France'}
        style={{
          width: '100%', minHeight: 90, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
          color: '#fff', fontSize: 11, ...MONO, padding: '8px 10px',
          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
        <span style={{ fontSize: 9, ...MONO, color: validLines.length > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.2)' }}>
          {validLines.length} ligne{validLines.length !== 1 ? 's' : ''} valide{validLines.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => upload.mutate()}
          disabled={upload.isPending || validLines.length === 0}
          style={{
            padding: '6px 14px', borderRadius: 7,
            background: validLines.length > 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${validLines.length > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.07)'}`,
            color: validLines.length > 0 ? GOLD : 'rgba(255,255,255,0.2)',
            fontSize: 10, ...BEBAS, letterSpacing: '0.08em',
            cursor: upload.isPending || validLines.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {upload.isPending ? '...' : 'UPLOAD'}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: 7, fontSize: 10, ...MONO, color: SUCCESS, padding: '5px 9px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 6 }}>
          +{result.added} carte{result.added !== 1 ? 's' : ''} ajoutée{result.added !== 1 ? 's' : ''} · stock: {result.stock}
        </div>
      )}
      {err && (
        <div style={{ marginTop: 7, fontSize: 10, ...MONO, color: DANGER, padding: '5px 9px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
          {err}
        </div>
      )}
    </div>
  )
}

// ── ProductRow with inventory stats ───────────────────────────────────────────
function ProductRow({
  p, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete, deleting,
}: {
  p: CollabProduct
  onEdit: () => void
  onDelete: () => void
  confirmDelete: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  deleting: boolean
}) {
  const meta = parseCardMeta(p.description)
  const lc = LEVEL_COLORS[meta.level] ?? LEVEL_COLORS.CLASSIC
  const queryClient = useQueryClient()

  const [showBulk, setShowBulk] = useState(false)

  const { data: inv } = useQuery<InventoryStats>({
    queryKey: ['collab-inventory', p.id],
    queryFn: () => api.get(`/api/collab/products/${p.id}/inventory`).then(r => r.data),
    staleTime: 30_000,
  })

  function handleBulkDone() {
    queryClient.invalidateQueries({ queryKey: ['collab-inventory', p.id] })
    queryClient.invalidateQueries({ queryKey: ['collab-products'] })
  }

  return (
    <div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ ...MONO, fontSize: 11, color: GOLD }}>€{Number(p.price).toFixed(2)}</span>
            {meta.bin && <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>BIN {meta.bin}</span>}
            {inv ? (
              <span style={{ ...MONO, fontSize: 9, color: inv.unsold > 0 ? SUCCESS : DANGER, background: inv.unsold > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${inv.unsold > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 4, padding: '1px 5px' }}>
                {inv.unsold} dispo · {inv.sold} vendues
              </span>
            ) : (
              <span style={{ ...MONO, fontSize: 9, color: p.stock > 0 ? SUCCESS : DANGER, background: p.stock > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${p.stock > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 4, padding: '1px 5px' }}>
                {p.stock > 0 ? `×${p.stock}` : 'ÉPUISÉ'}
              </span>
            )}
          </div>
          {/* Badges row */}
          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
            {meta.network !== 'OTHER' && <Badge label={meta.network} color={NETWORK_COLORS[meta.network]} />}
            <Badge label={meta.type} color={TYPE_COLORS[meta.type]} />
            {meta.device !== 'UNKNOWN' && <Badge label={meta.device} color={DEVICE_COLORS[meta.device]} />}
            {meta.source !== 'OTHER' && <Badge label={meta.source.replace('_', ' ')} color={SOURCE_COLORS[meta.source]} />}
            {meta.ddn && <Badge label={`DDN ${meta.ddn}`} color={{ bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)' }} />}
          </div>
        </div>
        {/* Actions */}
        {confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ ...LABEL_STYLE, color: DANGER }}>CONFIRMER ?</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={onDelete} disabled={deleting} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: DANGER, borderRadius: 7, padding: '5px 10px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>{deleting ? '...' : 'OUI'}</button>
              <button onClick={onCancelDelete} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', borderRadius: 7, padding: '5px 10px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>NON</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={onEdit} style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: GOLD, borderRadius: 7, padding: '5px 9px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>MODIFIER</button>
              <button onClick={onConfirmDelete} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: DANGER, borderRadius: 7, padding: '5px 9px', fontSize: 10, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}>SUPPR.</button>
            </div>
            <button
              onClick={() => setShowBulk(v => !v)}
              style={{ background: showBulk ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showBulk ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'}`, color: showBulk ? GOLD : 'rgba(255,255,255,0.35)', borderRadius: 7, padding: '4px 9px', fontSize: 9, ...BEBAS, letterSpacing: '0.06em', cursor: 'pointer' }}
            >
              BULK
            </button>
          </div>
        )}
      </div>
      {showBulk && <BulkUploadPanel productId={p.id} onDone={handleBulkDone} />}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function CollabDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/'), [navigate]))

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

  // categories kept for type compatibility — not used in this view directly
  useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then(r => r.data),
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const deleteProduct = useMutation({
    mutationFn: (id: number) => api.delete(`/api/collab/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-products'] })
      queryClient.invalidateQueries({ queryKey: ['collab-stats'] })
      setConfirmDelete(null)
    },
  })

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
          <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...LABEL_STYLE }}>MES CARTES</div>
            <button
              onClick={() => navigate('/collab/add')}
              style={{
                height: 28, paddingInline: 12, borderRadius: 8,
                border: '1px solid rgba(251,191,36,0.35)',
                background: 'rgba(251,191,36,0.08)',
                color: GOLD, cursor: 'pointer',
                fontSize: 10, ...BEBAS, letterSpacing: '0.08em',
              }}
            >
              + AJOUTER UNE CARTE
            </button>
          </div>

          {productsLoading ? (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1].map(i => <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, height: 72, opacity: 0.5 }} />)}
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '12px 14px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 12, ...MONO }}>Aucune carte pour l'instant.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {products.map((p, idx) => (
                <div key={p.id}>
                  {idx > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 14px' }} />}
                  <ProductRow
                    p={p}
                    onEdit={() => navigate(`/collab/edit/${p.id}`)}
                    onDelete={() => deleteProduct.mutate(p.id)}
                    confirmDelete={confirmDelete === p.id}
                    onConfirmDelete={() => setConfirmDelete(p.id)}
                    onCancelDelete={() => setConfirmDelete(null)}
                    deleting={deleteProduct.isPending && confirmDelete === p.id}
                  />
                </div>
              ))}
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
        textarea { resize: vertical; }
        textarea::placeholder { color: rgba(255,255,255,0.15); }
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
