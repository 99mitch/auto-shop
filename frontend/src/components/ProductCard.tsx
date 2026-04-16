import type { Product } from 'floramini-types'

interface Props {
  product: Product
  onClick: () => void
}

export default function ProductCard({ product, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl overflow-hidden text-left w-full transition-transform active:scale-95"
      style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
    >
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-36 object-cover"
          loading="lazy"
        />
        {product.stock === 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-red-500 text-white text-xs px-2 py-0.5 font-medium">
            Rupture
          </span>
        )}
        {product.stock > 0 && product.stock <= 3 && (
          <span className="absolute top-2 left-2 rounded-full bg-orange-400 text-white text-xs px-2 py-0.5 font-medium">
            Plus que {product.stock}
          </span>
        )}
      </div>
      <div className="p-3">
        <p
          className="text-sm font-semibold leading-tight mb-1 line-clamp-2"
          style={{ color: 'var(--tg-theme-text-color, #111827)' }}
        >
          {product.name}
        </p>
        <p className="text-base font-bold" style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
          €{product.price.toFixed(2)}
        </p>
      </div>
    </button>
  )
}
