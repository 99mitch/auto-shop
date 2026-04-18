import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import PageHeader from '../components/PageHeader'

export default function Cart() {
  const navigate = useNavigate()
  const { items, note, updateQuantity, setNote, subtotal } = useCartStore()

  useTelegramMainButton('Commander', () => navigate('/checkout'), items.length > 0)

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Mon panier" onBack={() => navigate('/')} />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <span className="text-6xl mb-4">🛒</span>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
            Votre panier est vide
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            Ajoutez des fleurs pour commencer
          </p>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--tg-theme-button-color, #0f172a)',
              color: 'var(--tg-theme-button-text-color, #fff)',
            }}
          >
            Voir le catalogue
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Mon panier" onBack={() => navigate('/')} />
      <div className="p-4">
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 rounded-xl p-3 border"
              style={{
                borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
                backgroundColor: 'var(--tg-theme-bg-color, #fff)',
              }}
            >
              <img
                src={item.productImageUrl}
                alt={item.productName}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--tg-theme-text-color)' }}
                >
                  {item.productName}
                </p>
                <p className="text-sm font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
                  €{(item.unitPrice * item.quantity).toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                  €{item.unitPrice.toFixed(2)} / unité
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f1f5f9)',
                    color: 'var(--tg-theme-text-color)',
                  }}
                >
                  −
                </button>
                <span
                  className="w-6 text-center text-sm font-semibold"
                  style={{ color: 'var(--tg-theme-text-color)' }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color, #0f172a)',
                    color: 'var(--tg-theme-button-text-color, #fff)',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div
          className="rounded-xl p-4 mb-4 border"
          style={{
            borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
            backgroundColor: 'var(--tg-theme-bg-color, #fff)',
          }}
        >
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--tg-theme-text-color)' }}
          >
            Note personnelle (optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Livrer après 17h, sonnette gauche..."
            rows={3}
            className="w-full rounded-lg p-3 text-sm resize-none outline-none"
            style={{
              backgroundColor: 'var(--tg-theme-secondary-bg-color, #f8fafc)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color, #e2e8f0)',
            }}
          />
        </div>

        {/* Summary */}
        <div
          className="rounded-xl p-4 border"
          style={{
            borderColor: 'var(--tg-theme-hint-color, #e2e8f0)',
            backgroundColor: 'var(--tg-theme-bg-color, #fff)',
          }}
        >
          <div className="flex justify-between text-sm mb-1">
            <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>Sous-total</span>
            <span className="font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
              €{subtotal().toFixed(2)}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
            + frais de livraison calculés à l&apos;étape suivante
          </p>
        </div>
      </div>
    </>
  )
}
