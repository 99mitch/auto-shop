import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'
import { useAdminAuth } from '../stores/auth'

export default function Admins() {
  const { isSuperAdmin } = useAdminAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newTelegramId, setNewTelegramId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (!isSuperAdmin) navigate('/', { replace: true }) }, [isSuperAdmin])

  const { data: admins = [] } = useQuery<any[]>({
    queryKey: ['web-admin-admins'],
    queryFn: () => adminApi.get('/api/web-admin/admins').then((r) => r.data),
    staleTime: 30_000,
    enabled: isSuperAdmin,
  })

  const promote = useMutation({
    mutationFn: (telegramId: string) => adminApi.post('/api/web-admin/admins', { telegramId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['web-admin-admins'] }); setNewTelegramId(''); setError('') },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erreur'),
  })

  const demote = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/api/web-admin/admins/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web-admin-admins'] }),
    onError: (err: any) => alert(err?.response?.data?.error ?? 'Erreur'),
  })

  if (!isSuperAdmin) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff' }}>GESTION DES ADMINS</h1>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>SUPER ADMIN UNIQUEMENT</p>
      </div>

      {/* Add admin */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.15)', padding: '16px 20px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 12 }}>PROMOUVOIR UN ADMIN</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Telegram ID (ex: 123456789)"
            value={newTelegramId}
            onChange={(e) => setNewTelegramId(e.target.value)}
            style={{ flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={() => promote.mutate(newTelegramId.trim())}
            disabled={!newTelegramId.trim() || promote.isPending}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              opacity: !newTelegramId.trim() || promote.isPending ? 0.5 : 1,
            }}>
            PROMOUVOIR
          </button>
        </div>
        {error && <div style={{ fontSize: 9, color: '#f87171', marginTop: 8, fontFamily: '"JetBrains Mono",monospace' }}>{error}</div>}
      </div>

      {/* Admin list */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {(admins as any[]).map((a, i) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 13, color: '#fff', fontWeight: 700 }}>{a.firstName}</span>
                {a.isSuperAdmin && (
                  <span style={{ fontSize: 8, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.15em', fontFamily: '"JetBrains Mono",monospace' }}>
                    SUPER ADMIN
                  </span>
                )}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>
                @{a.username ?? a.telegramId}
              </div>
            </div>
            {!a.isSuperAdmin && (
              <button
                onClick={() => { if (confirm('Rétrograder cet admin en client ?')) demote.mutate(a.id) }}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,100,100,0.2)', background: 'rgba(255,100,100,0.06)',
                  color: 'rgba(255,100,100,0.7)', cursor: 'pointer', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em',
                }}>
                RÉTROGRADER
              </button>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>
            Aucun admin
          </div>
        )}
      </div>
    </div>
  )
}
