import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Address, Favorite } from 'floramini-types'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import LoadingSkeleton from '../components/LoadingSkeleton'

export default function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/'), [navigate]))

  const tgUser = WebApp.initDataUnsafe?.user
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: 'Domicile', street: '', city: '', zip: '' })

  const { data: addresses = [], isLoading: addrLoading } = useQuery<Address[]>({
    queryKey: ['profile-addresses'],
    queryFn: () => api.get('/api/profile/addresses').then((r) => r.data),
  })

  const { data: favorites = [], isLoading: favLoading } = useQuery<Favorite[]>({
    queryKey: ['profile-favorites'],
    queryFn: () => api.get('/api/profile/favorites').then((r) => r.data),
  })

  const addAddress = useMutation({
    mutationFn: () => api.post('/api/profile/addresses', newAddr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-addresses'] })
      setShowAddForm(false)
      setNewAddr({ label: 'Domicile', street: '', city: '', zip: '' })
    },
  })

  const deleteAddress = useMutation({
    mutationFn: (id: number) => api.delete(`/api/profile/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-addresses'] }),
  })

  const removeFavorite = useMutation({
    mutationFn: (productId: number) => api.delete(`/api/profile/favorites/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-favorites'] }),
  })

  return (
    <div className="p-4 space-y-4">
      {/* User info */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        {tgUser?.photo_url ? (
          <img src={tgUser.photo_url} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}
          >
            🌸
          </div>
        )}
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--tg-theme-text-color)' }}>
            {tgUser ? `${tgUser.first_name}${tgUser.last_name ? ` ${tgUser.last_name}` : ''}` : 'Utilisateur'}
          </p>
          {tgUser?.username && (
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
              @{tgUser.username}
            </p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <button
        onClick={() => navigate('/orders')}
        className="w-full flex items-center justify-between rounded-2xl p-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
          📦 Mes commandes
        </span>
        <span style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>›</span>
      </button>

      {/* Addresses */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tg-theme-text-color)' }}>
            Mes adresses
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--tg-theme-button-color, #3b82f6)',
              color: 'var(--tg-theme-button-text-color, #fff)',
            }}
          >
            + Ajouter
          </button>
        </div>

        {showAddForm && (
          <div className="space-y-2 mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--tg-theme-bg-color, #fff)' }}>
            {(['label', 'street', 'city', 'zip'] as const).map((f) => (
              <input
                key={f}
                type="text"
                placeholder={f === 'label' ? 'Label (ex: Domicile)' : f === 'street' ? 'Rue' : f === 'city' ? 'Ville' : 'Code postal'}
                value={newAddr[f]}
                onChange={(e) => setNewAddr((p) => ({ ...p, [f]: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid var(--tg-theme-hint-color, #e5e7eb)', color: 'var(--tg-theme-text-color)' }}
              />
            ))}
            <button
              onClick={() => addAddress.mutate()}
              disabled={addAddress.isPending}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}
            >
              {addAddress.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        {addrLoading ? (
          <LoadingSkeleton className="h-12 rounded-xl" />
        ) : addresses.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
            Aucune adresse enregistrée
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--tg-theme-text-color)' }}>
                    {addr.label} {addr.isDefault && <span className="text-xs text-green-500">✓ défaut</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
                    {addr.street}, {addr.zip} {addr.city}
                  </p>
                </div>
                <button
                  onClick={() => deleteAddress.mutate(addr.id)}
                  className="text-xs text-red-400 ml-2 shrink-0"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Favorites */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tg-theme-text-color)' }}>
          Mes favoris
        </h3>
        {favLoading ? (
          <LoadingSkeleton className="h-16 rounded-xl" />
        ) : favorites.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
            Aucun favori pour le moment
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="relative rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--tg-theme-bg-color, #fff)' }}
              >
                {fav.product && (
                  <>
                    <img
                      src={fav.product.imageUrl}
                      alt={fav.product.name}
                      className="w-full h-20 object-cover"
                    />
                    <button
                      onClick={() => removeFavorite.mutate(fav.productId)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/80 text-xs flex items-center justify-center"
                    >
                      ❌
                    </button>
                    <p className="text-xs p-2 font-medium truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
                      {fav.product.name}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
