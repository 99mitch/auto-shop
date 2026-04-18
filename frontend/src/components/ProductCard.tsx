import { Plus } from 'lucide-react'
import type { Product } from 'floramini-types'
import { Badge } from './ui/badge'

interface Props {
  product: Product
  onClick: () => void
  onQuickAdd?: () => void
}

export default function ProductCard({ product, onClick, onQuickAdd }: Props) {
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
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-36 object-cover"
            loading="lazy"
          />
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Badge variant="danger">Rupture</Badge>
            </div>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <div className="absolute top-2 left-2">
              <Badge variant="warning">Plus que {product.stock}</Badge>
            </div>
          )}
        </div>
        <div className="px-3 pt-2.5 pb-1">
          <p
            className="text-xs font-semibold leading-tight line-clamp-2 mb-0.5"
            style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
          >
            {product.name}
          </p>
          {product.category && (
            <p className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color, #64748b)' }}>
              {product.category.name}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between px-3 pb-3">
        <span
          className="text-sm font-bold"
          style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
        >
          €{product.price.toFixed(2)}
        </span>
        {product.stock > 0 && onQuickAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAdd() }}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-95"
            style={{
              backgroundColor: 'var(--tg-theme-button-color, #0f172a)',
              color: 'var(--tg-theme-button-text-color, #fff)',
            }}
            aria-label={`Ajouter ${product.name} au panier`}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
