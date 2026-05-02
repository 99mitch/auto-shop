import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

export default function Cart() {
  const navigate = useNavigate()
  const { items, note, updateQuantity, setNote, subtotal } = useCartStore()

  useTelegramBackButton(() => navigate(-1))
  useTelegramMainButton(
    `Commander — €${subtotal().toFixed(2)}`,
    () => navigate('/checkout'),
    items.length > 0,
    '#1a1500',
    '#fbbf24',
  )

  if (items.length === 0) {
    return (
      <div style={{ background: '#050505', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Header onBack={() => navigate(-1)} count={0} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ fontSize: 36, opacity: 0.2 }}>▣</div>
          <p style={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em' }}>PANIER VIDE</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
              color: '#fbbf24', fontSize: 11, fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
            }}
          >
            VOIR LE CATALOGUE
          </button>
        </div>
        <Fonts />
      </div>
    )
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div style={{ background: '#050505', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Header onBack={() => navigate(-1)} count={items.length} />

      {/* Scrollable items + note */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <CartRow
            key={item.productId}
            item={item}
            onDecrement={() => updateQuantity(item.productId, item.quantity - 1)}
            onIncrement={() => updateQuantity(item.productId, item.quantity + 1)}
          />
        ))}

        {/* Note */}
        <div style={{
          background: '#111', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 6 }}>
              NOTE (OPTIONNEL)
            </div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Instructions de livraison..."
            rows={2}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              padding: '0 14px 12px', fontSize: 12, color: 'rgba(255,255,255,0.7)',
              fontFamily: '"JetBrains Mono", monospace', boxSizing: 'border-box',
              caretColor: '#fbbf24',
            }}
          />
        </div>

        {/* Spacer so last item isn't flush against summary */}
        <div style={{ height: 4, flexShrink: 0 }} />
      </div>

      {/* Summary — pinned at bottom */}
      <div style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#050505' }}>
        <div style={{
          background: '#111', borderRadius: 14,
          border: '1px solid rgba(251,191,36,0.15)',
          borderLeft: '3px solid rgba(251,191,36,0.6)',
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              SOUS-TOTAL ({totalQty} article{totalQty > 1 ? 's' : ''})
            </span>
            <span style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 24, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>
              €{subtotal().toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em' }}>
            FRAIS DE LIVRAISON CALCULÉS À L'ÉTAPE SUIVANTE
          </div>
        </div>
      </div>

      <Fonts />
    </div>
  )
}

function Header({ onBack, count }: { onBack: () => void; count: number }) {
  return (
    <div style={{
      flexShrink: 0,
      background: 'rgba(5,5,5,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(251,191,36,0.15)',
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button onClick={onBack} style={{
        width: 34, height: 34, borderRadius: 10,
        border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)',
        color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>←</button>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 18, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>
          MON PANIER
        </div>
        {count > 0 && (
          <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(251,191,36,0.6)', marginTop: 2, letterSpacing: '0.1em' }}>
            {count} article{count > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function CartRow({ item, onDecrement, onIncrement }: {
  item: { productId: number; productName: string; productImageUrl: string; unitPrice: number; quantity: number }
  onDecrement: () => void
  onIncrement: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div style={{
      background: '#111', borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', flexShrink: 0,
    }}>
      <div style={{
        width: 72, height: 45, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1a',
      }}>
        {item.productImageUrl && !imgError
          ? <img src={item.productImageUrl} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1c1c1e,#0d0d0d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 26, height: 18, borderRadius: 3, background: 'linear-gradient(135deg,#b8860b,#ffd700,#a07010)' }} />
            </div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
          {item.productName}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 18, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>
            €{(item.unitPrice * item.quantity).toFixed(2)}
          </span>
          {item.quantity > 1 && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              €{item.unitPrice.toFixed(2)} × {item.quantity}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={onDecrement} style={{
          width: 30, height: 30, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.12)', background: 'transparent',
          color: item.quantity === 1 ? '#ef4444' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer', fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>−</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', minWidth: 16, textAlign: 'center' }}>
          {item.quantity}
        </span>
        <button onClick={onIncrement} style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24', cursor: 'pointer', fontSize: 18, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
      </div>
    </div>
  )
}

function Fonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
      textarea::placeholder { color: rgba(255,255,255,0.18); }
    `}</style>
  )
}
