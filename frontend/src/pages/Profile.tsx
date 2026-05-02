import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { api } from '../lib/api'
import type { Favorite } from 'floramini-types'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'
import { useAuthStore } from '../stores/auth'

export default function Profile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/'), [navigate]))

  const { isAdmin, isCollab, isLoading: authLoading } = useAuthStore()
  const tgUser = WebApp.initDataUnsafe?.user

  const { data: favorites = [], isLoading: favLoading } = useQuery<Favorite[]>({
    queryKey: ['profile-favorites'],
    queryFn: () => api.get('/api/profile/favorites').then((r) => r.data),
  })

  const removeFavorite = useMutation({
    mutationFn: (productId: number) => api.delete(`/api/profile/favorites/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-favorites'] }),
  })

  const name = tgUser
    ? `${tgUser.first_name}${tgUser.last_name ? ` ${tgUser.last_name}` : ''}`
    : 'Utilisateur'

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/')} style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)',
          color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>←</button>
        <div>
          <div style={{ fontFamily: '"Bebas Neue", "Impact", sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>
            MON PROFIL
          </div>
          {tgUser?.username && (
            <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>
              @{tgUser.username}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Avatar + identity */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px 15px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {tgUser?.photo_url ? (
            <img src={tgUser.photo_url} alt="avatar" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(251,191,36,0.3)' }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              👤
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em' }}>{name}</div>
            {tgUser?.username && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono", monospace', marginTop: 3 }}>@{tgUser.username}</div>
            )}
            {(isAdmin || isCollab) && (
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 5, background: isAdmin ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${isAdmin ? 'rgba(251,191,36,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: isAdmin ? '#fbbf24' : '#4ade80', fontFamily: '"JetBrains Mono", monospace' }}>
                  {isAdmin ? 'ADMIN' : 'COLLABORATEUR'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 15px 0' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 6 }}>NAVIGATION</div>
          </div>
          <NavRow label="MES COMMANDES" icon="📦" onClick={() => navigate('/orders')} />
          {!authLoading && isAdmin && (
            <NavRow label="PANEL ADMIN" icon="⚙" onClick={() => navigate('/admin')} accent="gold" />
          )}
          {!authLoading && (isCollab || isAdmin) && (
            <NavRow label="MON ESPACE COLLAB" icon="◈" onClick={() => navigate('/collab')} accent="green" />
          )}
        </div>

        {/* Favorites */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 15px 0' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono", monospace', marginBottom: 9 }}>MES FAVORIS</div>
          </div>
          <div style={{ padding: '0 15px 13px' }}>
            {favLoading ? (
              <div style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
            ) : favorites.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono", monospace', padding: '6px 0' }}>Aucun favori pour le moment</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {favorites.map((fav) => fav.product && (
                  <div key={fav.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: '#1a1a1a' }}>
                    <img src={fav.product.imageUrl} alt={fav.product.name} style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }} />
                    <button onClick={() => removeFavorite.mutate(fav.productId)} style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
                      background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.6)', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                    <div style={{ padding: '5px 7px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: '"JetBrains Mono", monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {fav.product.name}
                    </div>
                    <div style={{ padding: '0 7px 6px', fontSize: 11, color: '#fbbf24', fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em' }}>
                      €{fav.product.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
      `}</style>
    </div>
  )
}

function NavRow({ label, icon, onClick, accent }: { label: string; icon: string; onClick: () => void; accent?: 'gold' | 'green' }) {
  const color = accent === 'gold' ? '#fbbf24' : accent === 'green' ? '#4ade80' : 'rgba(255,255,255,0.55)'
  const bg = accent === 'gold' ? 'rgba(251,191,36,0.04)' : accent === 'green' ? 'rgba(34,197,94,0.04)' : 'transparent'
  const border = accent ? `1px solid ${accent === 'gold' ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)'}` : 'none'

  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 15px', cursor: 'pointer', background: bg,
      borderTop: '1px solid rgba(255,255,255,0.04)', borderLeft: 'none', borderRight: 'none', borderBottom: border,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, color, opacity: 0.7 }}>›</span>
    </button>
  )
}
