import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { useCartStore } from '../stores/cart'

interface AddedToCartSheetProps {
  productId: number
  productName: string
  productPrice: number
  bin?: string
  niveau?: string
  onClose: () => void
}

const NIVEAU_ACCENT: Record<string, string> = {
  GOLD:    '#fbbf24',
  PREMIER: '#a78bfa',
  CLASSIC: 'rgba(255,255,255,0.2)',
}

export default function AddedToCartSheet({ productId, productName, productPrice, bin, niveau = 'CLASSIC', onClose }: AddedToCartSheetProps) {
  const navigate = useNavigate()
  const { items, updateQuantity } = useCartStore()
  const cartItem = items.find((i) => i.productId === productId)
  const quantity = cartItem?.quantity ?? 1
  const [imgError, setImgError] = useState(false)
  const accent = NIVEAU_ACCENT[niveau] ?? 'rgba(255,255,255,0.2)'

  useEffect(() => {
    const timer = setTimeout(onClose, 8000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          borderTop: `2px solid ${accent}`,
          borderRadius: '20px 20px 0 0',
          padding: '8px 16px 32px',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '0 auto 16px' }} />

        {/* Card image + info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {/* Card visual */}
          <div style={{
            width: 80, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            border: `1px solid ${accent}40`,
            background: '#1a1a1a',
          }}>
            {bin && !imgError
              ? <img
                  src={`https://cardimages.imaginecurve.com/cards/${bin}.png`}
                  alt=""
                  onError={() => setImgError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              : <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg,#1c1c1e,#0d0d0d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 28, height: 20, borderRadius: 3, background: 'linear-gradient(135deg,#b8860b,#ffd700,#a07010)' }} />
                </div>
            }
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: accent, fontFamily: '"JetBrains Mono", monospace', marginBottom: 3 }}>
              AJOUTÉ AU PANIER
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bin ?? productName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono", monospace', marginTop: 1 }}>
              €{productPrice.toFixed(2)}
            </div>
          </div>

          {/* Qty controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => updateQuantity(productId, quantity - 1)}
              style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Minus size={12} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', minWidth: 16, textAlign: 'center' }}>
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(productId, quantity + 1)}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
                color: accent, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { onClose(); navigate('/catalogue') }}
            style={{
              flex: 1, height: 44, borderRadius: 12, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
            }}
          >
            CONTINUER
          </button>
          <button
            onClick={() => navigate('/cart')}
            style={{
              flex: 1, height: 44, borderRadius: 12, cursor: 'pointer',
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
              color: accent, fontSize: 12, fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em',
            }}
          >
            VOIR LE PANIER
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </>
  )
}
