import { useState } from 'react'
import type { Product } from 'floramini-types'

interface Props {
  product: Product
  onClick: () => void
  onQuickAdd?: () => void
  dark?: boolean
  bin?: string
  niveau?: string
  age?: number
  cp?: string
  tags?: string[]
  banque?: string
}

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  VISA:          { bg: 'rgba(99,102,241,0.18)',  color: '#818cf8' },
  MASTERCARD:    { bg: 'rgba(249,115,22,0.18)',  color: '#fb923c' },
  DEBIT:         { bg: 'rgba(234,179,8,0.18)',   color: '#facc15' },
  CREDIT:        { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
  AMELI:         { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  ANDROID:       { bg: 'rgba(34,211,238,0.15)',  color: '#22d3ee' },
  IPHONE:        { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
  "AUJOURD'HUI": { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  'J-1':         { bg: 'rgba(251,191,36,0.08)',  color: 'rgba(251,191,36,0.55)' },
  'J-2':         { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' },
}

const NIVEAU_ACCENT: Record<string, string> = {
  GOLD:    '#fbbf24',
  PREMIER: '#a78bfa',
  CLASSIC: 'rgba(255,255,255,0.2)',
}

function Tag({ label }: { label: string }) {
  const c = TAG_COLORS[label] ?? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
      padding: '2px 6px', borderRadius: 4,
      fontFamily: '"JetBrains Mono", monospace',
      whiteSpace: 'nowrap', lineHeight: '16px',
    }}>
      {label}
    </span>
  )
}

function FicheDossier({ product, onClick, onQuickAdd, bin, niveau = 'CLASSIC', age, cp, tags = [], banque }: Props) {
  const [imgError, setImgError] = useState(false)
  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 3
  const accent = NIVEAU_ACCENT[niveau] ?? 'rgba(255,255,255,0.2)'
  const imgUrl = bin ? `https://cardimages.imaginecurve.com/cards/${bin}.png` : null

  return (
    <div
      className="card-fiche"
      style={{
        background: '#111',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${accent}`,
        overflow: 'hidden',
        opacity: isOut ? 0.6 : 1,
        transition: 'border-color 0.2s, transform 0.15s',
      }}
    >
      {/* Header — thumbnail + BIN + tags */}
      <button
        onClick={onClick}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}
      >
        {/* Card thumbnail */}
        <div style={{ width: 64, height: 40, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a' }}>
          {imgUrl && !imgError
            ? <img src={imgUrl} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1c1c1e,#0d0d0d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 22, height: 17, borderRadius: 3, background: 'linear-gradient(135deg,#b8860b,#ffd700,#a07010)' }} />
              </div>
          }
        </div>

        {/* BIN + tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', lineHeight: 1, marginBottom: 8 }}>
            {bin ?? product.id}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map(t => <Tag key={t} label={t} />)}
          </div>
        </div>
      </button>

      {/* Data grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'AGE',         value: age != null ? `${age} ans` : '—' },
          { label: 'BANQUE',      value: banque ?? product.category?.name ?? '—' },
          { label: 'NIVEAU',      value: niveau },
          { label: 'CODE POSTAL', value: cp ?? '—' },
        ].map((f, i) => (
          <div key={f.label} style={{
            padding: '9px 14px',
            borderRight:  i % 2 === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            borderBottom: i < 2       ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 3 }}>{f.label}</div>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: f.label === 'NIVEAU' ? accent : 'rgba(255,255,255,0.85)',
              fontFamily: '"JetBrains Mono", monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 22, color: accent, letterSpacing: '0.04em', lineHeight: 1 }}>
            €{product.price.toFixed(2)}
          </span>
          {isLow && <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: '#f59e0b', letterSpacing: '0.1em' }}>⚠ {product.stock} restant{product.stock > 1 ? 's' : ''}</span>}
          {isOut  && <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: '#ef4444', letterSpacing: '0.1em' }}>ÉPUISÉ</span>}
        </div>
        {product.stock > 0 && onQuickAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
            aria-label={`Ajouter ${product.name}`}
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: `color-mix(in srgb, ${accent} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
              color: accent, cursor: 'pointer', fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >+</button>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        .card-fiche { cursor: default; }
        .card-fiche:active { transform: scale(0.99); }
        @media (hover: hover) {
          .card-fiche:hover { border-color: rgba(255,255,255,0.14) !important; }
        }
      `}</style>
    </div>
  )
}

function DefaultCard({ product, onClick, onQuickAdd }: Props) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border active:scale-[0.98] transition-transform"
      style={{ borderColor: 'var(--tg-theme-hint-color, #e2e8f0)', backgroundColor: 'var(--tg-theme-bg-color, #fff)' }}
    >
      <button onClick={onClick} className="flex-1 text-left">
        <div className="relative">
          <img src={product.imageUrl} alt={product.name} className="w-full h-36 object-cover" loading="lazy" />
          {product.stock === 0 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded">Rupture</span></div>}
          {product.stock > 0 && product.stock <= 3 && <div className="absolute top-2 left-2"><span className="text-xs font-bold text-white bg-amber-500 px-2 py-0.5 rounded">Plus que {product.stock}</span></div>}
        </div>
        <div className="px-3 pt-2.5 pb-1">
          <p className="text-xs font-semibold leading-tight line-clamp-2 mb-0.5" style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}>{product.name}</p>
          {product.category && <p className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color, #64748b)' }}>{product.category.name}</p>}
        </div>
      </button>
      <div className="flex items-center justify-between px-3 pb-3">
        <span className="text-sm font-bold" style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}>€{product.price.toFixed(2)}</span>
        {product.stock > 0 && onQuickAdd && (
          <button onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
            className="flex h-7 w-7 items-center justify-center rounded-lg active:scale-95"
            style={{ backgroundColor: 'var(--tg-theme-button-color, #0f172a)', color: 'var(--tg-theme-button-text-color, #fff)' }}
          >+</button>
        )}
      </div>
    </div>
  )
}

export default function ProductCard(props: Props) {
  if (props.dark) return <FicheDossier {...props} />
  return <DefaultCard {...props} />
}
