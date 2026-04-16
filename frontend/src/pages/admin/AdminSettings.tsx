import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Settings } from 'floramini-types'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'

export default function AdminSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/admin'), [navigate]))

  const [deliveryFee, setDeliveryFee] = useState('')
  const [timeSlotsText, setTimeSlotsText] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: settings } = useQuery<Settings>({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/api/admin/settings').then((r) => r.data),
  })

  useEffect(() => {
    if (settings) {
      setDeliveryFee(String(settings.deliveryFee ?? 5))
      setTimeSlotsText((settings.timeSlots ?? []).join('\n'))
    }
  }, [settings])

  const save = useMutation({
    mutationFn: () =>
      api.put('/api/admin/settings', {
        deliveryFee: parseFloat(deliveryFee),
        timeSlots: timeSlotsText.split('\n').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
        Réglages
      </h2>

      <div
        className="rounded-2xl p-4 space-y-4"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color, #f9fafb)' }}
      >
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
            Frais de livraison (€)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              border: '1px solid var(--tg-theme-hint-color, #e5e7eb)',
              color: 'var(--tg-theme-text-color)',
              backgroundColor: 'var(--tg-theme-bg-color, #fff)',
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
            Créneaux de livraison (un par ligne)
          </label>
          <textarea
            value={timeSlotsText}
            onChange={(e) => setTimeSlotsText(e.target.value)}
            rows={6}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none font-mono"
            style={{
              border: '1px solid var(--tg-theme-hint-color, #e5e7eb)',
              color: 'var(--tg-theme-text-color)',
              backgroundColor: 'var(--tg-theme-bg-color, #fff)',
            }}
            placeholder={'09:00-11:00\n11:00-13:00\n13:00-15:00'}
          />
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: 'var(--tg-theme-button-color, #3b82f6)', color: '#fff' }}
        >
          {save.isPending ? 'Sauvegarde...' : saved ? '✅ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
