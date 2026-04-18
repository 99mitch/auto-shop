import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowLeft, ShoppingCart, Minus, Plus } from 'lucide-react'
import { Button } from './ui/button'
import { useCartStore } from '../stores/cart'

interface AddedToCartSheetProps {
  productId: number
  productName: string
  productPrice: number
  onClose: () => void
}

export default function AddedToCartSheet({ productId, productName, productPrice, onClose }: AddedToCartSheetProps) {
  const navigate = useNavigate()
  const { items, updateQuantity } = useCartStore()
  const cartItem = items.find((i) => i.productId === productId)
  const quantity = cartItem?.quantity ?? 1

  useEffect(() => {
    const timer = setTimeout(onClose, 8000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 animate-slide-up"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color, #fff)',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2e8f0]" />

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0fdf4]">
            <CheckCircle2 size={20} className="text-[#22c55e]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}>
              Ajouté au panier !
            </p>
            <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #64748b)' }}>
              {productName} · €{productPrice.toFixed(2)}
            </p>
          </div>
          {/* Quantity selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(productId, quantity - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{ borderColor: 'var(--tg-theme-hint-color, #e5e7eb)', color: 'var(--tg-theme-text-color)' }}
            >
              <Minus size={14} />
            </button>
            <span className="w-5 text-center text-sm font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(productId, quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--tg-theme-button-color, #3b82f6)',
                color: 'var(--tg-theme-button-text-color, #fff)',
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { onClose(); navigate('/catalogue') }}>
            <ArrowLeft size={14} />
            Continuer
          </Button>
          <Button className="flex-1" onClick={() => navigate('/cart')}>
            <ShoppingCart size={14} />
            Voir le panier
          </Button>
        </div>
      </div>
    </>
  )
}
