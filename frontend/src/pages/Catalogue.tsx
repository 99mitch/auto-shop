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

export type CardExtras = { bin: string; niveau: string; age: number; cp: string; tags: string[]; banque: string; categoryId?: number; isActive?: boolean }
export type MockCard = Omit<Product, 'categoryId' | 'isActive'> & CardExtras

const mc = (
  id: number, bin: string, name: string, price: number, stock: number,
  catId: number, catName: string, catSlug: string, desc: string,
  niveau: string, age: number, cp: string, tags: string[], banque: string,
): MockCard => ({
  id, bin, name, price, stock, imageUrl: CARD_IMG(bin), images: [], description: desc,
  categoryId: catId, isActive: true, niveau, age, cp, tags, banque,
  category: { id: catId, name: catName, slug: catSlug, order: catId },
})

const MOCK_CARDS: MockCard[] = [
  mc(1,  '497203', 'Crédit Mutuel Visa Classic',    18, 8,  1, 'Visa', 'visa', 'Crédit Mutuel — Visa Classic. Balance vérifiée, CVV inclus.',  'CLASSIC', 34, '75012', ['VISA', 'DEBIT',   "AUJOURD'HUI"],                  'CRÉDIT MUTUEL'),
  mc(2,  '497207', 'Crédit Mutuel Visa Gold',       30, 3,  1, 'Visa', 'visa', 'Crédit Mutuel — Visa Gold. Plafond élevé. CVV + date inclus.', 'GOLD',    48, '69001', ['VISA', 'CREDIT', 'AMELI', 'ANDROID', 'J-1'],       'CRÉDIT MUTUEL'),
  mc(3,  '497208', 'CIC Visa Premier',              45, 5,  1, 'Visa', 'visa', 'CIC — Visa Premier. Fullz disponible sur demande.',            'PREMIER', 52, '33000', ['VISA', 'CREDIT', 'AMELI', 'IPHONE', "AUJOURD'HUI"], 'CIC'),
  mc(4,  '497490', 'Crédit Agricole Visa Classic',  15, 12, 1, 'Visa', 'visa', 'Crédit Agricole — Visa Classic. Testé & valide.',             'CLASSIC', 27, '13001', ['VISA', 'DEBIT',   'ANDROID', "AUJOURD'HUI"],        'CRÉDIT AGRICOLE'),
  mc(5,  '497492', 'Crédit Agricole Visa Premier',  38, 2,  1, 'Visa', 'visa', 'Crédit Agricole — Visa Premier. Stock limité.',               'PREMIER', 61, '59000', ['VISA', 'CREDIT', 'AMELI', 'IPHONE', 'J-1'],         'CRÉDIT AGRICOLE'),
  mc(6,  '497410', 'LCL Visa Classic',              20, 9,  1, 'Visa', 'visa', 'LCL — Visa Classic. Livraison en moins de 24h.',              'CLASSIC', 38, '44000', ['VISA', 'DEBIT',   "AUJOURD'HUI"],                  'LCL'),
  mc(7,  '497413', 'LCL Visa Premier',              42, 6,  1, 'Visa', 'visa', 'LCL — Visa Premier. Haut plafond. CVV + expiry fournis.',     'PREMIER', 47, '31000', ['VISA', 'CREDIT', 'AMELI', 'ANDROID', "AUJOURD'HUI"], 'LCL'),
  mc(8,  '497974', 'BNP Paribas Visa Premier',      55, 4,  1, 'Visa', 'visa', 'BNP Paribas — Visa Premier. Compte vérifié, solde garanti.',  'PREMIER', 55, '75008', ['VISA', 'CREDIT', 'AMELI', 'IPHONE', 'J-1'],         'BNP PARIBAS'),
  mc(9,  '498208', 'Société Générale Visa Premier', 48, 7,  1, 'Visa', 'visa', 'Société Générale — Visa Premier. Fullz dispo.',               'PREMIER', 43, '92100', ['VISA', 'CREDIT', 'ANDROID', "AUJOURD'HUI"],          'SOCIÉTÉ GÉNÉRALE'),
  mc(10, '534543', 'BNP Paribas Mastercard Gold',   50, 3,  2, 'Mastercard', 'mc', 'BNP Paribas — Mastercard Gold. Solde élevé.',             'GOLD',    39, '06000', ['MASTERCARD', 'CREDIT', 'AMELI', 'IPHONE', 'J-1'],   'BNP PARIBAS'),
  mc(11, '529941', 'Société Générale Mastercard',   35, 8,  2, 'Mastercard', 'mc', 'SG — Mastercard Standard. Balance testée.',               'CLASSIC', 24, '67000', ['MASTERCARD', 'DEBIT', 'ANDROID', "AUJOURD'HUI"],    'SOCIÉTÉ GÉNÉRALE'),
  mc(12, '497110', 'La Banque Postale Visa',        12, 0,  1, 'Visa', 'visa', 'La Banque Postale — Visa Classic. Réapprovisionnement 48h.',  'CLASSIC', 23, '16000', ['VISA', 'DEBIT',   "AUJOURD'HUI"],                  'LA BANQUE POSTALE'),
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
  const allProducts = isCards ? (MOCK_CARDS as any[]) : (apiProducts as any[])

  const products = allProducts.filter((p) => {
    const matchCat    = activeCategory === ALL_SLUG || p.category?.slug === activeCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleQuickAdd = useCallback((product: Product) => {
    addItem({ productId: product.id, productName: product.name, productImageUrl: product.imageUrl, unitPrice: product.price, options: {} })
    WebApp.HapticFeedback?.notificationOccurred('success')
    setAddedProduct(product)
  }, [addItem])

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${accent.border}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/')} style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          border: `1px solid ${accent.border}`, background: accent.faint,
          color: accent.main, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }} aria-label="Retour">←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 18, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>{label}</div>
          {!isLoading && <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: accent.dim, marginTop: 2, letterSpacing: '0.1em' }}>{products.length} article{products.length !== 1 ? 's' : ''}</div>}
        </div>
        <CartIcon dark />
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent.border}`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 14,
        }}>
          <span style={{ color: accent.dim, fontSize: 13, flexShrink: 0 }}>⌕</span>
          <input
            type="text" placeholder="Rechercher..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#fff', fontFamily: '"JetBrains Mono", monospace', caretColor: accent.main }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: accent.dim, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>}
        </div>

        {/* Category pills */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}>
          {[{ id: 0, slug: ALL_SLUG, name: 'Tous' }, ...categories].map((cat) => {
            const active = activeCategory === cat.slug
            return (
              <button key={cat.slug} onClick={() => setActiveCategory(cat.slug)} style={{
                flexShrink: 0, borderRadius: 8, padding: '6px 12px',
                fontSize: 11, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
                cursor: 'pointer', transition: 'all 0.15s',
                background: active ? accent.faint : 'transparent',
                border: `1px solid ${active ? accent.main : 'rgba(255,255,255,0.1)'}`,
                color: active ? accent.main : 'rgba(255,255,255,0.4)',
              }}>
                {cat.name.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 140, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent.border}`, animation: 'shimmer 1.5s ease-in-out infinite' }} />
          ))
        ) : products.length === 0 ? (
          <div style={{ paddingTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>▣</div>
            <p style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>AUCUN RÉSULTAT</p>
          </div>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              dark
              bin={product.bin}
              niveau={product.niveau}
              age={product.age}
              cp={product.cp}
              tags={product.tags}
              banque={product.banque}
              onClick={() => navigate(`/product/${product.id}`)}
              onQuickAdd={() => handleQuickAdd(product)}
            />
          ))
        )}
      </div>

      {addedProduct && (
        <AddedToCartSheet productId={addedProduct.id} productName={addedProduct.name} productPrice={addedProduct.price} onClose={() => setAddedProduct(null)} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}
