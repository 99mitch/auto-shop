import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product, Category } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ProductCard from '../components/ProductCard'
import AddedToCartSheet from '../components/AddedToCartSheet'

const ALL_SLUG = 'all'

export default function Catalogue() {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [activeCategory, setActiveCategory] = useState(ALL_SLUG)
  const [search, setSearch] = useState('')
  const [addedProduct, setAddedProduct] = useState<Product | null>(null)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', activeCategory, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (activeCategory !== ALL_SLUG) params.set('category', activeCategory)
      if (search) params.set('search', search)
      return api.get(`/api/products?${params}`).then((r) => r.data)
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleQuickAdd = useCallback((product: Product) => {
    addItem({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice: product.price,
      options: {},
    })
    WebApp.HapticFeedback?.notificationOccurred('success')
    setAddedProduct(product)
  }, [addItem])

  return (
    <div className="px-4 py-4">
      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f3f4f6)' }}
      >
        <Search size={14} style={{ color: 'var(--tg-theme-hint-color, #9ca3af)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Rechercher une fleur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Effacer">
            <X size={14} style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {[{ slug: ALL_SLUG, name: 'Tous' }, ...categories].map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={
              activeCategory === cat.slug
                ? {
                    backgroundColor: 'var(--tg-theme-button-color, #0f172a)',
                    color: 'var(--tg-theme-button-text-color, #fff)',
                  }
                : {
                    border: '1px solid var(--tg-theme-hint-color, #e2e8f0)',
                    color: 'var(--tg-theme-hint-color, #64748b)',
                  }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-3">🌿</span>
          <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            Aucun produit trouvé
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => navigate(`/product/${product.id}`)}
              onQuickAdd={() => handleQuickAdd(product)}
            />
          ))}
        </div>
      )}

      {addedProduct && (
        <AddedToCartSheet
          productId={addedProduct.id}
          productName={addedProduct.name}
          productPrice={addedProduct.price}
          onClose={() => setAddedProduct(null)}
        />
      )}
    </div>
  )
}
