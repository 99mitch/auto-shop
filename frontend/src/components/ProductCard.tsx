import { useState } from 'react'
import type { Product } from 'floramini-types'

interface Props {
  product: Product
  onClick: () => void
  onQuickAdd?: () => void
  dark?: boolean
  bin?: string
}

function CardImageTile({ product, onClick, onQuickAdd, bin }: Props) {
  const [imgError, setImgError] = useState(false)
  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 3
  const imgUrl = bin ? `https://cardimages.imaginecurve.com/cards/${bin}.png` : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Card image */}
      <button
        onClick={onClick}
        className="card-tile"
        style={{
          width: '100%', aspectRatio: '1.586',
          borderRadius: 12,
          border: '1px solid rgba(251,191,36,0.2)',
          overflow: 'hidden', cursor: isOut ? 'default' : 'pointer',
          padding: 0, position: 'relative',
          background: '#111',
          transition: 'transform 0.15s, border-color 0.2s',
          display: 'block',
        }}
      >
        {/* Real card image */}
        {imgUrl && !imgError ? (
          <img
            src={imgUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          /* CSS fallback card */
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(145deg, #1c1c1e 0%, #111 60%, #0d0d0d 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{
                width: 26, height: 20, borderRadius: 3,
                background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #a07010 100%)',
              }} />
              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 12, color: 'rgba(251,191,36,0.7)' }}>
                {product.category?.name ?? 'CARD'}
              </span>
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em' }}>
              •••• •••• •••• {String(product.id).padStart(4, '0').slice(-4)}
            </div>
          </div>
        )}

        {/* Price badge */}
        <div style={{
          position: 'absolute', bottom: 7, right: 7,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(251,191,36,0.35)',
          borderRadius: 6, padding: '2px 7px',
          fontFamily: '"Bebas Neue", "Impact", sans-serif',
          fontSize: 14, color: '#fbbf24', letterSpacing: '0.04em',
          lineHeight: 1.4,
          pointerEvents: 'none',
        }}>
          €{product.price.toFixed(2)}
        </div>

        {/* Out of stock overlay */}
        {isOut && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700,
              color: '#ef4444', border: '1px solid rgba(239,68,68,0.5)',
              padding: '2px 7px', borderRadius: 4, letterSpacing: '0.15em',
            }}>ÉPUISÉ</span>
          </div>
        )}

        {/* Low stock badge */}
        {isLow && (
          <div style={{
            position: 'absolute', top: 6, left: 6,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(245,158,11,0.5)',
            borderRadius: 5, padding: '2px 6px',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 8, fontWeight: 700,
            color: '#f59e0b', letterSpacing: '0.1em',
          }}>
            ⚠ {product.stock}
          </div>
        )}
      </button>

      {/* Info bar below the card */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 2px 2px',
      }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10, color: 'rgba(255,255,255,0.55)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: '80%',
        }}>
          {product.name}
        </div>
        {product.stock > 0 && onQuickAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
            aria-label={`Ajouter ${product.name}`}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
              color: '#fbbf24', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, lineHeight: 1,
              transition: 'background 0.15s',
            }}
          >+</button>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        .card-tile:active { transform: scale(0.97) !important; }
        @media (hover: hover) {
          .card-tile:hover { border-color: rgba(251,191,36,0.5) !important; transform: translateY(-1px); }
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
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded">Rupture</span>
            </div>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <div className="absolute top-2 left-2">
              <span className="text-xs font-bold text-white bg-amber-500 px-2 py-0.5 rounded">Plus que {product.stock}</span>
            </div>
          )}
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
            aria-label={`Ajouter ${product.name} au panier`}
          >+</button>
        )}
      </div>
    </div>
  )
}

export default function ProductCard(props: Props) {
  if (props.dark) return <CardImageTile {...props} />
  return <DefaultCard {...props} />
}
