import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

const CARD_IMG = (bin: string) => `https://cardimages.imaginecurve.com/cards/${bin}.png`
type MockCard = Omit<Product, 'categoryId' | 'isActive'> & { bin: string; categoryId?: number; isActive?: boolean }

const mk = (id: number, bin: string, name: string, price: number, stock: number, catId: number, catName: string, catSlug: string, desc: string): MockCard => ({
  id, bin, name, price, stock, imageUrl: CARD_IMG(bin), images: [], description: desc,
  categoryId: catId, isActive: true,
  category: { id: catId, name: catName, slug: catSlug, order: catId },
})

const MOCK_CARDS: MockCard[] = [
  mk(1,  '414720', 'Visa Classic FR',    12,  8,  1, 'Visa',       'visa', 'Visa Classic France. Balance vérifiée. Livraison immédiate.'),
  mk(2,  '414709', 'Visa Gold UK',       22,  5,  1, 'Visa',       'visa', 'Visa Gold United Kingdom. CVV inclus.'),
  mk(3,  '422150', 'Visa Platinum DE',   35,  3,  1, 'Visa',       'visa', 'Visa Platinum Allemagne. Haut plafond.'),
  mk(4,  '424631', 'Visa Business US',   55,  6,  1, 'Visa',       'visa', 'Visa Business USA. Solde élevé garanti.'),
  mk(5,  '431940', 'Visa Infinite BE',   75,  2,  1, 'Visa',       'visa', 'Visa Infinite Belgique. Limite premium.'),
  mk(6,  '438857', 'Visa Signature ES',  40,  9,  1, 'Visa',       'visa', 'Visa Signature Espagne. Frais zéro.'),
  mk(7,  '450875', 'Visa Debit NL',      9,   15, 1, 'Visa',       'visa', 'Visa Debit Pays-Bas. Format fullz disponible.'),
  mk(8,  '453641', 'Visa Electron IT',   11,  7,  1, 'Visa',       'visa', 'Visa Electron Italie. Testé & valide.'),
  mk(9,  '465901', 'Visa Prepaid CH',    18,  0,  1, 'Visa',       'visa', 'Visa Prépayé Suisse. Rechargeable.'),
  mk(10, '522166', 'MC Standard FR',     14,  10, 2, 'Mastercard', 'mc',   'Mastercard Standard France. CVV + expiry inclus.'),
  mk(11, '529204', 'MC Gold UK',         28,  4,  2, 'Mastercard', 'mc',   'Mastercard Gold UK. Limite 5000£.'),
  mk(12, '540010', 'MC Platinum DE',     42,  1,  2, 'Mastercard', 'mc',   'Mastercard Platinum Allemagne. Très haut de gamme.'),
]

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [showSheet, setShowSheet] = useState(false)
  const [imgError, setImgError] = useState(false)

  useTelegramBackButton(() => navigate(-1))

  // Check if this is a mock card (id 1-12)
  const numId = Number(id)
  const mockCard = MOCK_CARDS.find((c) => c.id === numId)

  const { data: apiProduct, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/api/products/${id}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !mockCard,
  })

  const product = mockCard ?? apiProduct

  const handleAddToCart = useCallback(() => {
    if (!product) return
    addItem({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice: product.price,
      options: {},
    })
    WebApp.HapticFeedback?.notificationOccurred('success')
    setShowSheet(true)
  }, [product, addItem])

  useTelegramMainButton(
    product ? `Ajouter au panier — €${product.price.toFixed(2)}` : 'Chargement...',
    handleAddToCart,
    !!product && product.stock > 0 && !showSheet
  )

  if (isLoading) {
    return (
      <div style={{ background: '#050505', minHeight: '100vh', padding: 16 }}>
        <div style={{ height: 44, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }} />
        <div style={{ height: 200, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
        <div style={{ height: 24, width: '60%', marginBottom: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
        <div style={{ height: 16, marginBottom: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
        <div style={{ height: 16, width: '75%', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }} />
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>▣</div>
        <p style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>INTROUVABLE</p>
      </div>
    )
  }

  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stock <= 5

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            border: '1px solid rgba(251,191,36,0.2)',
            background: 'rgba(251,191,36,0.08)',
            color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
          aria-label="Retour"
        >←</button>
        <div style={{
          flex: 1, overflow: 'hidden',
          fontFamily: '"Bebas Neue", "Impact", sans-serif',
          fontSize: 16, letterSpacing: '0.08em', color: '#fff',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {product.name}
        </div>
        <CartIcon dark />
      </div>

      {/* Card preview */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          width: '100%', aspectRatio: '1.586',
          borderRadius: 18, overflow: 'hidden',
          border: '1px solid rgba(251,191,36,0.25)',
          position: 'relative', background: '#111',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Real card image */}
          {mockCard && !imgError ? (
            <img
              src={`https://cardimages.imaginecurve.com/cards/${mockCard.bin}.png`}
              alt={product.name}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            /* CSS fallback */
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(145deg, #1c1c1e 0%, #111 55%, #0d0d0d 100%)',
              padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 28, borderRadius: 4, background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #a07010 100%)' }} />
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: 'rgba(251,191,36,0.8)' }}>{product.category?.name ?? 'FULLZ'}</span>
              </div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 12 }}>
                <span>••••</span><span>••••</span><span>••••</span><span style={{ color: 'rgba(255,255,255,0.9)' }}>{String(product.id).padStart(4,'0').slice(-4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.15em', marginBottom: 3 }}>CARDHOLDER</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>{product.name}</div>
                </div>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 28, color: '#fbbf24' }}>€{product.price.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Price badge over real image */}
          {mockCard && !imgError && (
            <div style={{
              position: 'absolute', bottom: 12, right: 12,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: 8, padding: '4px 10px',
              fontFamily: '"Bebas Neue", "Impact", sans-serif',
              fontSize: 20, color: '#fbbf24', letterSpacing: '0.04em',
            }}>
              €{product.price.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div style={{ padding: '20px 16px' }}>

        {/* Status */}
        {isOut && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, color: '#ef4444', letterSpacing: '0.1em',
          }}>
            ✕ RUPTURE DE STOCK
          </div>
        )}
        {isLow && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, color: '#f59e0b', letterSpacing: '0.1em',
          }}>
            ⚠ PLUS QUE {product.stock} EN STOCK
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              DESCRIPTION
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Add button (fallback if Telegram button not available) */}
        {product.stock > 0 && (
          <button
            onClick={handleAddToCart}
            style={{
              width: '100%', marginTop: 16,
              padding: '14px 0', borderRadius: 14,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.35)',
              color: '#fbbf24', cursor: 'pointer',
              fontFamily: '"Bebas Neue", "Impact", sans-serif',
              fontSize: 18, letterSpacing: '0.1em',
              transition: 'background 0.15s',
            }}
          >
            AJOUTER AU PANIER — €{product.price.toFixed(2)}
          </button>
        )}
      </div>

      {showSheet && (
        <AddedToCartSheet
          productId={product.id}
          productName={product.name}
          productPrice={product.price}
          onClose={() => setShowSheet(false)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </div>
  )
}
