import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

export default function CollabDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: c } = useQuery<any>({
    queryKey: ['web-admin-collab', id],
    queryFn: () => adminApi.get(`/api/web-admin/collabs/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  if (!c) return (
    <div style={{ padding: 32, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>
      Chargement…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('/collabs')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: '6px 10px' }}>←</button>
        <div>
          <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 26, letterSpacing: '0.1em', color: '#fff' }}>{c.firstName} {c.lastName ?? ''}</h1>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>@{c.username ?? c.telegramId}</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'GAINS TOTAUX', value: `€${c.totalEarnings.toFixed(2)}` },
          { label: 'COMMISSIONS', value: `€${c.totalPlatformFee.toFixed(2)}` },
          { label: 'CARTES LISTÉES', value: c.products.length },
          { label: 'CARTES VENDUES', value: c.products.reduce((s: number, p: any) => s + p.salesCount, 0) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#111', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', fontFamily: '"JetBrains Mono",monospace', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 22, color: '#fbbf24' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>CARTES</div>
        </div>
        {c.products.map((p: any, i: number) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 16px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: '#fff' }}>{p.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Stock: {p.stock}</div>
            </div>
            <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 16, color: '#fbbf24' }}>€{p.price.toFixed(2)}</div>
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{p.salesCount} vendues</div>
            <div style={{ fontSize: 9, color: p.isActive ? '#4ade80' : 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>
              {p.isActive ? 'ACTIF' : 'INACTIF'}
            </div>
          </div>
        ))}
        {c.products.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>
            Aucune carte listée
          </div>
        )}
      </div>
    </div>
  )
}
