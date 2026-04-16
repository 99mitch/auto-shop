import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Product, Category } from 'floramini-types'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ProductCard from '../components/ProductCard'

const ALL_SLUG = 'all'

export default function Catalogue() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState(ALL_SLUG)
  const [search, setSearch] = useState('')

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

  return (
    <div className="px-4 py-4">
      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Rechercher une fleur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f3f4f6)',
            color: 'var(--tg-theme-text-color, #111827)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 text-sm"
            style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {[{ slug: ALL_SLUG, name: 'Tous' }, ...categories].map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              activeCategory === cat.slug
                ? {
                    backgroundColor: 'var(--tg-theme-button-color, #3b82f6)',
                    color: 'var(--tg-theme-button-text-color, #fff)',
                  }
                : {
                    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f3f4f6)',
                    color: 'var(--tg-theme-text-color, #374151)',
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
            <LoadingSkeleton key={i} className="h-52" />
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
