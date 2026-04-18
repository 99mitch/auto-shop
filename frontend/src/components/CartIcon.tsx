import { useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCartStore } from '../stores/cart'

export default function CartIcon({ dark = false }: { dark?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const totalItems = useCartStore((s) => s.totalItems())

  if (location.pathname === '/cart') return null

  return (
    <button
      onClick={() => navigate('/cart')}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors active:scale-95"
      style={{
        backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'var(--tg-theme-secondary-bg-color, #f1f5f9)',
        color: dark ? '#fff' : 'var(--tg-theme-text-color, #0f172a)',
      }}
      aria-label="Panier"
    >
      <ShoppingBag size={20} />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white leading-none">
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </button>
  )
}
