import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCartStore } from '../stores/cart'
import { useTelegramMainButton } from '../hooks/useTelegramMainButton'
import type { Address, Order } from 'floramini-types'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageHeader from '../components/PageHeader'

function getDeliveryDate(): Date {
  const d = new Date()
  let added = 0
  while (added < 3) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return d
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, note, subtotal, clear } = useCartStore()

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [newAddress, setNewAddress] = useState({ label: 'Domicile', street: '', city: '', zip: '' })
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(5)

  const { data: addresses = [], isLoading: addrLoading } = useQuery<Address[]>({
    queryKey: ['profile-addresses'],
    queryFn: () => api.get('/api/profile/addresses').then((r) => r.data),
  })

  useEffect(() => {
    api
      .get('/api/admin/settings')
      .then((r) => {
        if (r.data.deliveryFee) setDeliveryFee(r.data.deliveryFee)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0]
      setSelectedAddressId(def.id)
    } else if (addresses.length === 0) {
      setUseNewAddress(true)
    }
  }, [addresses])

  const total = subtotal() + deliveryFee

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        deliverySlot: getDeliveryDate().toISOString(),
        note: note || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          options: i.options,
        })),
      }

      if (useNewAddress) {
        body.newAddress = newAddress
      } else {
        body.addressId = selectedAddressId
      }

      const order: Order = await api.post('/api/orders', body).then((r) => r.data)
      await api.post(`/api/orders/${order.id}/pay`)
      return order
    },
    onSuccess: (order) => {
      clear()
      navigate(`/order/${order.id}`)
    },
  })

  const canSubmit =
    items.length > 0 &&
    !createOrderMutation.isPending &&
    (useNewAddress
      ? newAddress.street.trim() !== '' && newAddress.city.trim() !== '' && newAddress.zip.trim() !== ''
      : !!selectedAddressId)

  useTelegramMainButton(
    createOrderMutation.isPending ? 'Traitement...' : `Payer €${total.toFixed(2)}`,
    () => createOrderMutation.mutate(),
    canSubmit
  )

  return (
    <>
    <PageHeader title="Livraison" />
    <div className="p-4 space-y-4">
      {/* Address */}
      {addrLoading ? (
        <LoadingSkeleton className="h-24 rounded-2xl" />
      ) : (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tg-theme-text-color)' }}>
            Adresse de livraison
          </h3>
          {addresses.length > 0 && (
            <div className="space-y-2 mb-3">
              {addresses.map((addr) => (
                <label key={addr.id} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="address"
                    checked={!useNewAddress && selectedAddressId === addr.id}
                    onChange={() => {
                      setSelectedAddressId(addr.id)
                      setUseNewAddress(false)
                    }}
                    className="mt-0.5"
                  />
                  <span className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
                    <strong>{addr.label}</strong> — {addr.street}, {addr.zip} {addr.city}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="address"
                  checked={useNewAddress}
                  onChange={() => setUseNewAddress(true)}
                />
                <span className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
                  Nouvelle adresse
                </span>
              </label>
            </div>
          )}
          {useNewAddress && (
            <div className="space-y-2">
              {(['street', 'city', 'zip'] as const).map((field) => (
                <input
                  key={field}
                  type="text"
                  placeholder={field === 'street' ? 'Rue et numéro' : field === 'city' ? 'Ville' : 'Code postal'}
                  value={newAddress[field]}
                  onChange={(e) => setNewAddress((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--tg-theme-bg-color, #fff)',
                    color: 'var(--tg-theme-text-color)',
                    border: '1px solid var(--tg-theme-hint-color, #e5e7eb)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delivery info */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <span className="text-xl">🚚</span>
        <p className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
          Livraison sous <strong>3 jours ouvrés</strong>
        </p>
      </div>

      {/* Order summary */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tg-theme-text-color)' }}>
          Récapitulatif
        </h3>
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.productId} className="flex justify-between text-sm">
              <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                {i.productName} ×{i.quantity}
              </span>
              <span style={{ color: 'var(--tg-theme-text-color)' }}>
                €{(i.unitPrice * i.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div
            className="border-t pt-2 mt-2"
            style={{ borderColor: 'var(--tg-theme-hint-color, #e5e7eb)' }}
          >
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>Livraison</span>
              <span style={{ color: 'var(--tg-theme-text-color)' }}>€{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span style={{ color: 'var(--tg-theme-text-color)' }}>Total</span>
              <span style={{ color: 'var(--tg-theme-button-color, #3b82f6)' }}>
                €{total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {createOrderMutation.isError && (
          <p className="mt-3 text-xs text-red-500 text-center">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}
      </div>
    </div>
    </>
  )
}
