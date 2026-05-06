import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

export default function Collabs() {
  const navigate = useNavigate()
  const { data: collabs = [] } = useQuery<any[]>({
    queryKey: ['web-admin-collabs'],
    queryFn: () => adminApi.get('/api/web-admin/collabs').then((r) => r.data),
    staleTime: 30_000,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff' }}>COLLABORATEURS</h1>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>{collabs.length} partenaires actifs</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {collabs.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/collabs/${c.id}`)}
            style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '18px 20px', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 13, color: '#fff', fontWeight: 700 }}>{c.firstName} {c.lastName ?? ''}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>@{c.username ?? c.telegramId}</div>
              </div>
              <span style={{ color: 'rgba(251,191,36,0.5)', fontSize: 16 }}>›</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'CARTES LISTÉES', value: c.cardCount },
                { label: 'CARTES VENDUES', value: c.cardsSold },
                { label: 'GAINS', value: `€${c.totalEarnings.toFixed(2)}` },
                { label: 'COMMISSIONS', value: `€${c.totalPlatformFee.toFixed(2)}` },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', fontFamily: '"JetBrains Mono",monospace', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 18, color: '#fbbf24', letterSpacing: '0.04em' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {collabs.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>
            Aucun collaborateur
          </div>
        )}
      </div>
    </div>
  )
}
