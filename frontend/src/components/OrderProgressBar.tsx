import type { OrderStatus } from 'floramini-types'

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'PENDING',    label: 'En attente',  icon: '🕐' },
  { status: 'CONFIRMED',  label: 'Confirmée',   icon: '✅' },
  { status: 'PREPARING',  label: 'Préparation', icon: '👨‍🍳' },
  { status: 'DELIVERING', label: 'Livraison',   icon: '🚚' },
  { status: 'DELIVERED',  label: 'Livrée',      icon: '🌸' },
]

const ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED']

export default function OrderProgressBar({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 py-4">
        <span className="text-2xl">❌</span>
        <span className="text-red-500 font-semibold">Commande annulée</span>
      </div>
    )
  }

  const currentIndex = ORDER.indexOf(status)

  return (
    <div className="flex items-start justify-between w-full py-4 overflow-x-auto">
      {STEPS.map((step, i) => (
        <div key={step.status} className="flex flex-col items-center flex-1 relative">
          {i < STEPS.length - 1 && (
            <div
              className="absolute top-4 left-1/2 w-full h-0.5 z-0"
              style={{
                backgroundColor: i < currentIndex ? '#22c55e' : '#e5e7eb',
              }}
            />
          )}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 transition-all"
            style={{
              backgroundColor: i <= currentIndex ? '#22c55e' : '#e5e7eb',
              color: i <= currentIndex ? '#fff' : '#9ca3af',
            }}
          >
            {i <= currentIndex ? step.icon : <span className="text-xs">●</span>}
          </div>
          <span
            className="text-xs text-center mt-1 leading-tight px-1"
            style={{ color: i <= currentIndex ? 'var(--tg-theme-text-color, #111827)' : 'var(--tg-theme-hint-color, #9ca3af)' }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
