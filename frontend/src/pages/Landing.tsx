import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Category, Product } from 'floramini-types'
import CartIcon from '../components/CartIcon'

const CATEGORY_GRADIENTS = [
  ['#be185d', '#9d174d'],
  ['#d97706', '#b45309'],
  ['#7c3aed', '#5b21b6'],
  ['#059669', '#047857'],
  ['#dc2626', '#991b1b'],
  ['#0891b2', '#0e7490'],
]

const CATEGORY_BG = [
  '#1e0a0f',
  '#1a0e00',
  '#0f0a1e',
  '#0a1a0e',
  '#1a0a0a',
  '#0a141a',
]

export default function Landing() {
  const navigate = useNavigate()

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-featured'],
    queryFn: () => api.get('/api/products?limit=6').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const goToCategory = (slug: string) => navigate(`/catalogue?category=${slug}`)
  const goToCatalogue = () => navigate('/catalogue')

  return (
    <div style={{ background: '#0f0f0f' }}>

      {/* Cart icon overlay */}
      <div className="absolute top-4 right-4 z-50">
        <CartIcon dark />
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden flex flex-col items-center justify-end pb-10"
        style={{ height: 320, background: 'linear-gradient(180deg, #1a0a2e 0%, #0f0f0f 100%)' }}
      >
        {/* Glow blobs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: '10%', left: '50%', transform: 'translateX(-50%)',
            width: 260, height: 260,
            background: 'radial-gradient(circle, rgba(139,92,246,0.32) 0%, transparent 70%)',
            animation: 'glowPulse 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: '20%', left: '28%',
            width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)',
            animation: 'glowPulse 4s ease-in-out infinite reverse',
          }}
        />

        {/* Brand */}
        <div className="relative text-center">
          <span style={{ fontSize: 52, display: 'block', marginBottom: 10, animation: 'floatEmoji 3s ease-in-out infinite' }}>
            🌸
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1, marginBottom: 6 }}>
            FloraMini
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Fleurs fraîches, livrées chez vous
          </p>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ padding: '24px 0 0' }}>
          <p style={{ padding: '0 24px 16px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Explorer par catégorie
          </p>
          <div
            className="flex overflow-x-auto scrollbar-hide"
            style={{ padding: '12px 20px 16px', gap: 20 }}
          >
            {categories.map((cat, i) => {
              const [from, to] = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]
              return (
                <button
                  key={cat.slug}
                  onClick={() => goToCategory(cat.slug)}
                  className="flex flex-col items-center shrink-0"
                  style={{ gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: 68, height: 68,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${from}, ${to})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 30,
                      boxShadow: `0 0 0 2px rgba(255,255,255,0.1)`,
                      animation: `bubbleFloat 3s ease-in-out ${i * 0.4}s infinite`,
                      position: 'relative',
                    }}
                  >
                    🌸
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 68 }}>
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Featured products */}
      {products.length > 0 && (
        <div style={{ paddingTop: 28 }}>
          <p style={{ padding: '0 24px 16px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Nouveautés
          </p>
          <div
            className="flex overflow-x-auto scrollbar-hide"
            style={{ padding: '0 16px 4px', gap: 12 }}
          >
            {products.slice(0, 6).map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="shrink-0 text-left"
                style={{ width: 130, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ borderRadius: 16, overflow: 'hidden', background: '#1a1a1a' }}>
                  <div
                    style={{
                      width: 130, height: 100,
                      background: CATEGORY_BG[i % CATEGORY_BG.length],
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
                      €{p.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '28px 16px 40px' }}>
        <button
          onClick={goToCatalogue}
          className="w-full"
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: '14px 0',
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Voir tous les produits →
        </button>
      </div>

      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes floatEmoji {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes bubbleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
