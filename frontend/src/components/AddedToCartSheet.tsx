import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowLeft, ShoppingCart } from 'lucide-react'
import { Button } from './ui/button'

interface AddedToCartSheetProps {
  productName: string
  productPrice: number
  onClose: () => void
}

export default function AddedToCartSheet({ productName, productPrice, onClose }: AddedToCartSheetProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 animate-slide-up"
        style={{
          backgroundColor: 'var(--tg-theme-bg-color, #fff)',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
        }}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e2e8f0]" />

        {/* Product info */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0fdf4]">
            <CheckCircle2 size={20} className="text-[#22c55e]" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--tg-theme-text-color, #0f172a)' }}>
              Ajouté au panier !
            </p>
            <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #64748b)' }}>
              {productName} · €{productPrice.toFixed(2)}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
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
