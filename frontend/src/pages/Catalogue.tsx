import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product, Category } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ProductCard from '../components/ProductCard'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

const ALL_SLUG = 'all'

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') ?? 'cards'
  const addItem = useCartStore((s) => s.addItem)
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') ?? ALL_SLUG)
  const [search, setSearch] = useState('')
  const [addedProduct, setAddedProduct] = useState<Product | null>(null)

  useTelegramBackButton(() => navigate('/'))

  const accent = type === 'digital'
    ? { main: 'rgba(34,211,238,1)', dim: 'rgba(34,211,238,0.6)', faint: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.2)' }
    : { main: 'rgba(251,191,36,1)',  dim: 'rgba(251,191,36,0.6)',  faint: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.2)'  }

  const label = type === 'digital' ? 'DONNÉES DIGITALES' : 'VENTE DE CARTES'

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
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,5,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${accent.border}`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            border: `1px solid ${accent.border}`,
            background: accent.faint,
            color: accent.main, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, transition: 'background 0.15s',
          }}
          aria-label="Retour"
        >
          ←
        </button>

        {/* Title */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"Bebas Neue", "Impact", sans-serif',
            fontSize: 18, letterSpacing: '0.08em',
            color: '#ffffff', lineHeight: 1,
          }}>
            {label}
          </div>
          {products.length > 0 && !isLoading && (
            <div style={{
              fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
              color: accent.dim, marginTop: 2,
              letterSpacing: '0.1em',
            }}>
              {products.length} article{products.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Cart */}
        <CartIcon dark />
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${accent.border}`,
          borderRadius: 12, padding: '10px 14px',
          marginBottom: 14,
        }}>
          <span style={{ color: accent.dim, fontSize: 12, fontFamily: '"JetBrains Mono", monospace', flexShrink: 0 }}>⌕</span>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              caretColor: accent.main,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: accent.dim, cursor: 'pointer', fontSize: 14, padding: 0 }}>
              ×
            </button>
          )}
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div
            className="scrollbar-hide"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}
          >
            {[{ slug: ALL_SLUG, name: 'Tous' }, ...categories].map((cat) => {
              const active = activeCategory === cat.slug
              return (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  style={{
                    flexShrink: 0, borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 11, fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: active ? accent.faint : 'transparent',
                    border: `1px solid ${active ? accent.main : 'rgba(255,255,255,0.1)'}`,
                    color: active ? accent.main : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {cat.name.toUpperCase()}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ padding: '0 16px 32px' }}>
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '100%', aspectRatio: '1.586',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${accent.border}`,
                  animation: 'shimmer 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ paddingTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>▣</div>
            <p style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
              AUCUN RÉSULTAT
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                dark
                onClick={() => navigate(`/product/${product.id}`)}
                onQuickAdd={() => handleQuickAdd(product)}
              />
            ))}
          </div>
        )}
      </div>

      {addedProduct && (
        <AddedToCartSheet
          productId={addedProduct.id}
          productName={addedProduct.name}
          productPrice={addedProduct.price}
          onClose={() => setAddedProduct(null)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
