import type { OrderStatus } from 'floramini-types'

const CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  PENDING:    { label: 'En attente',     classes: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:  { label: 'Confirmée',      classes: 'bg-blue-100 text-blue-800' },
  PREPARING:  { label: 'En préparation', classes: 'bg-purple-100 text-purple-800' },
  DELIVERING: { label: 'En livraison',   classes: 'bg-orange-100 text-orange-800' },
  DELIVERED:  { label: 'Livrée',         classes: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'Annulée',        classes: 'bg-red-100 text-red-800' },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, classes } = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
