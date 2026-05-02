import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Product } from 'floramini-types'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import AddedToCartSheet from '../components/AddedToCartSheet'
import CartIcon from '../components/CartIcon'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const [showSheet, setShowSheet] = useState(false)

  useTelegramBackButton(() => navigate(-1))

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/api/products/${id}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

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

      {/* Card preview — full-width credit card */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{
          width: '100%', aspectRatio: '1.586',
          borderRadius: 18,
          background: 'linear-gradient(145deg, #1c1c1e 0%, #111111 55%, #0d0d0d 100%)',
          border: '1px solid rgba(251,191,36,0.25)',
          position: 'relative', overflow: 'hidden',
          padding: '18px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Diagonal shimmer */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(115deg, transparent 25%, rgba(251,191,36,0.05) 50%, transparent 75%)',
            pointerEvents: 'none',
          }} />
          {/* Glow bottom right */}
          <div style={{
            position: 'absolute', bottom: -30, right: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Chip */}
            <div style={{
              width: 36, height: 28, borderRadius: 4,
              background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #a07010 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.2)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(0,0,0,0.15)' }} />
            </div>
            <div style={{
              fontFamily: '"Bebas Neue", "Impact", sans-serif',
              fontSize: 18, letterSpacing: '0.06em',
              color: 'rgba(251,191,36,0.8)',
            }}>
              {product.category?.name?.toUpperCase() ?? 'FULLZ'}
            </div>
          </div>

          {/* Card number */}
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 15, letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.65)',
            display: 'flex', gap: 12,
          }}>
            <span>••••</span><span>••••</span><span>••••</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{String(product.id).padStart(4, '0').slice(-4)}</span>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 3 }}>
                CARDHOLDER
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
                {product.name}
              </div>
            </div>
            <div style={{
              fontFamily: '"Bebas Neue", "Impact", sans-serif',
              fontSize: 28, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1,
            }}>
              €{product.price.toFixed(2)}
            </div>
          </div>
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
