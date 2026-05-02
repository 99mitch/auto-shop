import type { Product } from 'floramini-types'

interface Props {
  product: Product
  onClick: () => void
  onQuickAdd?: () => void
  dark?: boolean
}

function CardTile({ product, onClick, onQuickAdd }: Props) {
  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 3

  return (
    <button
      onClick={onClick}
      className="card-tile"
      style={{
        width: '100%',
        aspectRatio: '1.586',
        borderRadius: 14,
        background: 'linear-gradient(145deg, #1c1c1e 0%, #111111 60%, #0d0d0d 100%)',
        border: '1px solid rgba(251,191,36,0.2)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isOut ? 'not-allowed' : 'pointer',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s, transform 0.15s',
      }}
    >
      {/* Shimmer diagonal */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(115deg, transparent 30%, rgba(251,191,36,0.04) 50%, transparent 70%)',
      }} />

      {/* Out of stock overlay */}
      {isOut && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10, fontWeight: 700,
            color: '#ef4444', letterSpacing: '0.15em',
            border: '1px solid rgba(239,68,68,0.4)',
            padding: '3px 8px', borderRadius: 4,
          }}>ÉPUISÉ</span>
        </div>
      )}

      {/* Top row: chip + network */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 12px 0' }}>
        {/* EMV Chip */}
        <div style={{
          width: 26, height: 20, borderRadius: 3,
          background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #a07010 100%)',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.25)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.2)', transform: 'translateX(-50%)' }} />
        </div>

        {/* Card network / category */}
        <div style={{
          fontFamily: '"Bebas Neue", "Impact", sans-serif',
          fontSize: 13, letterSpacing: '0.06em',
          color: 'rgba(251,191,36,0.75)',
        }}>
          {product.category?.name?.toUpperCase() ?? 'CARD'}
        </div>
      </div>

      {/* Card number row */}
      <div style={{ padding: '0 12px' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11, letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.55)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span>••••</span><span>••••</span><span>••••</span>
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>
            {String(product.id).padStart(4, '0').slice(-4)}
          </span>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 12px 10px',
      }}>
        {/* Name + low stock */}
        <div>
          <div style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", monospace',
            marginBottom: 2,
          }}>CARDHOLDER</div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", monospace',
            maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {product.name}
          </div>
          {isLow && (
            <div style={{ fontSize: 8, color: '#f59e0b', letterSpacing: '0.1em', marginTop: 2, fontFamily: '"JetBrains Mono", monospace' }}>
              ⚠ {product.stock} LEFT
            </div>
          )}
        </div>

        {/* Price + add button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            fontFamily: '"Bebas Neue", "Impact", sans-serif',
            fontSize: 18, letterSpacing: '0.04em',
            color: '#fbbf24',
            lineHeight: 1,
          }}>
            €{product.price.toFixed(2)}
          </div>
          {product.stock > 0 && onQuickAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
              aria-label={`Ajouter ${product.name}`}
              style={{
                width: 22, height: 22,
                borderRadius: 5,
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.35)',
                color: '#fbbf24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, lineHeight: 1,
                transition: 'background 0.15s',
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        .card-tile:active { transform: scale(0.97) !important; }
        @media (hover: hover) {
          .card-tile:hover:not(:disabled) { border-color: rgba(251,191,36,0.45) !important; }
        }
      `}</style>
    </button>
  )
}

function DefaultCard({ product, onClick, onQuickAdd }: Props) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden border active:scale-[0.98] transition-transform"
      style={{
        borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
        backgroundColor: 'var(--tg-theme-bg-color, #fff)',
      }}
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
          <p className="text-xs font-semibold leading-tight line-clamp-2 mb-0.5" style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}>
            {product.name}
          </p>
          {product.category && (
            <p className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color, #64748b)' }}>{product.category.name}</p>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between px-3 pb-3">
        <span className="text-sm font-bold" style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}>
          €{product.price.toFixed(2)}
        </span>
        {product.stock > 0 && onQuickAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-95"
            style={{ backgroundColor: 'var(--tg-theme-button-color, #0f172a)', color: 'var(--tg-theme-button-text-color, #fff)' }}
            aria-label={`Ajouter ${product.name} au panier`}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

export default function ProductCard(props: Props) {
  return props.dark ? <CardTile {...props} /> : <DefaultCard {...props} />
}
