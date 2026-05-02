import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product, Category } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import ProductCard from '../components/ProductCard'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

const ALL_SLUG = 'all'

const CARD_IMG = (bin: string) => `https://cardimages.imaginecurve.com/cards/${bin}.png`

type MockCard = Omit<Product, 'categoryId' | 'isActive'> & { bin: string; categoryId?: number; isActive?: boolean }

const mc = (id: number, bin: string, name: string, price: number, stock: number, catId: number, catName: string, catSlug: string, desc: string): MockCard => ({
  id, bin, name, price, stock, imageUrl: CARD_IMG(bin), images: [], description: desc,
  categoryId: catId, isActive: true,
  category: { id: catId, name: catName, slug: catSlug, order: catId },
})

const MOCK_CARDS: MockCard[] = [
  mc(1,  '497203', 'Crédit Mutuel Visa Classic',      18, 8,  1, 'Visa',       'visa', 'Crédit Mutuel — Visa Classic. Balance vérifiée, CVV inclus. Livraison immédiate.'),
  mc(2,  '497207', 'Crédit Mutuel Visa Gold',         30, 3,  1, 'Visa',       'visa', 'Crédit Mutuel — Visa Gold. Plafond élevé. CVV + date inclus.'),
  mc(3,  '497208', 'CIC Visa Premier',                45, 5,  1, 'Visa',       'visa', 'CIC — Visa Premier. Haut de gamme. Fullz disponible sur demande.'),
  mc(4,  '497490', 'Crédit Agricole Visa Classic',    15, 12, 1, 'Visa',       'visa', 'Crédit Agricole — Visa Classic. Testé & valide. CVV inclus.'),
  mc(5,  '497492', 'Crédit Agricole Visa Premier',    38, 2,  1, 'Visa',       'visa', 'Crédit Agricole — Visa Premier. Limite premium. Stock limité.'),
  mc(6,  '497410', 'LCL Visa Classic',                20, 9,  1, 'Visa',       'visa', 'LCL — Visa Classic. Balance vérifiée. Livraison en moins de 24h.'),
  mc(7,  '497413', 'LCL Visa Premier',                42, 6,  1, 'Visa',       'visa', 'LCL — Visa Premier. Haut plafond. CVV + expiry fournis.'),
  mc(8,  '497974', 'BNP Paribas Visa Premier',        55, 4,  1, 'Visa',       'visa', 'BNP Paribas — Visa Premier. Compte vérifié, solde garanti.'),
  mc(9,  '498208', 'Société Générale Visa Premier',   48, 7,  1, 'Visa',       'visa', 'Société Générale — Visa Premier. Validité longue durée. Fullz dispo.'),
  mc(10, '534543', 'BNP Paribas Mastercard Gold',     50, 3,  2, 'Mastercard', 'mc',   'BNP Paribas — Mastercard Gold. Solde élevé. CVV inclus.'),
  mc(11, '529941', 'Société Générale Mastercard',     35, 8,  2, 'Mastercard', 'mc',   'Société Générale — Mastercard Standard. Balance testée. Livraison immédiate.'),
  mc(12, '497110', 'La Banque Postale Visa',          12, 0,  1, 'Visa',       'visa', 'La Banque Postale — Visa Classic. Rupture temporaire. Réapprovisionnement sous 48h.'),
]

const CARD_CATEGORIES: Category[] = [
  { id: 1, name: 'Visa',       slug: 'visa', order: 1 },
  { id: 2, name: 'Mastercard', slug: 'mc',   order: 2 },
]

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') ?? 'cards'
  const addItem = useCartStore((s) => s.addItem)
  const [activeCategory, setActiveCategory] = useState(ALL_SLUG)
  const [search, setSearch] = useState('')
  const [addedProduct, setAddedProduct] = useState<Product | null>(null)

  useTelegramBackButton(() => navigate('/'))

  const isCards = type === 'cards'
  const accent = isCards
    ? { main: 'rgba(251,191,36,1)', dim: 'rgba(251,191,36,0.6)', faint: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' }
    : { main: 'rgba(34,211,238,1)',  dim: 'rgba(34,211,238,0.6)',  faint: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.2)'  }

  const label = isCards ? 'VENTE DE CARTES' : 'DONNÉES DIGITALES'

  // --- Cards: use mock data ---
  const { data: apiCategories = [], isLoading: catLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !isCards,
  })

  const { data: apiProducts = [], isLoading: prodLoading } = useQuery<Product[]>({
    queryKey: ['products', activeCategory, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (activeCategory !== ALL_SLUG) params.set('category', activeCategory)
      if (search) params.set('search', search)
      return api.get(`/api/products?${params}`).then((r) => r.data)
    },
    staleTime: 5 * 60 * 1000,
    enabled: !isCards,
  })

  const categories = isCards ? CARD_CATEGORIES : apiCategories
  const isLoading  = isCards ? false : (catLoading || prodLoading)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProducts: (Product & { bin?: string })[] = isCards ? (MOCK_CARDS as any) : apiProducts

  const products = allProducts.filter((p) => {
    const matchCat  = activeCategory === ALL_SLUG || p.category?.slug === activeCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
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
        <button
          onClick={() => navigate('/')}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            border: `1px solid ${accent.border}`, background: accent.faint,
            color: accent.main, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
          aria-label="Retour"
        >←</button>

        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"Bebas Neue", "Impact", sans-serif',
            fontSize: 18, letterSpacing: '0.08em', color: '#fff', lineHeight: 1,
          }}>
            {label}
          </div>
          {!isLoading && (
            <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: accent.dim, marginTop: 2, letterSpacing: '0.1em' }}>
              {products.length} article{products.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <CartIcon dark />
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${accent.border}`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
        }}>
          <span style={{ color: accent.dim, fontSize: 13, flexShrink: 0 }}>⌕</span>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: '#fff',
              fontFamily: '"JetBrains Mono", monospace',
              caretColor: accent.main,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: accent.dim, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Category pills */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}>
          {[{ id: 0, slug: ALL_SLUG, name: 'Tous' }, ...categories].map((cat) => {
            const active = activeCategory === cat.slug
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                style={{
                  flexShrink: 0, borderRadius: 8, padding: '6px 12px',
                  fontSize: 11, fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
                  cursor: 'pointer', transition: 'all 0.15s',
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
      </div>

      {/* Grid */}
      <div style={{ padding: '0 16px 32px' }}>
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                width: '100%', aspectRatio: '1.586', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${accent.border}`,
                animation: 'shimmer 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ paddingTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>▣</div>
            <p style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>AUCUN RÉSULTAT</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                bin={(product as Product & { bin?: string }).bin}
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
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
