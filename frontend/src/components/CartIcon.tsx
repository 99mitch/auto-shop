import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cart'

export default function CartIcon() {
  const navigate = useNavigate()
  const totalItems = useCartStore((s) => s.totalItems())

  return (
    <button
      onClick={() => navigate('/cart')}
      className="relative p-2 rounded-full"
      style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)' }}
      aria-label="Panier"
    >
      <span className="text-xl leading-none">🛒</span>
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold leading-none">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  )
}
