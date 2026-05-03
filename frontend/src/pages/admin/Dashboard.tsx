import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: stats } = useQuery<any>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const navItems = [
    { label: 'CARTES', sub: 'Catalogue', path: '/admin/products', icon: '🃏', color: '#fbbf24' },
    { label: 'COMMANDES', sub: 'Historique', path: '/admin/orders', icon: '📦', color: 'rgba(251,191,36,0.7)' },
    { label: 'COLLABS', sub: 'Partenaires', path: '/admin/collaborators', icon: '◈', color: '#4ade80' },
    { label: 'RÉGLAGES', sub: 'Config', path: '/admin/settings', icon: '⚙', color: 'rgba(255,255,255,0.4)' },
  ]

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/profile')} style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)',
          color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>←</button>
        <div>
          <div style={{ fontFamily: '"Bebas Neue","Impact",sans-serif', fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>PANEL ADMIN</div>
          <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>FULLZ · TABLEAU DE BORD</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: "CA TOTAL", value: `€${(stats?.totalRevenue ?? 0).toFixed(2)}`, sub: `${stats?.totalOrders ?? 0} commandes`, big: true },
            { label: "AUJOURD'HUI", value: `€${(stats?.revenueToday ?? 0).toFixed(2)}`, sub: `${stats?.ordersToday ?? 0} ventes` },
            { label: "CARTES ACTIVES", value: String(stats?.productCount ?? '—'), sub: 'dans le catalogue' },
            { label: "COMMISSIONS", value: `€${(stats?.totalPlatformFees ?? 0).toFixed(2)}`, sub: 'part plateforme' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#111', borderRadius: 14,
              border: i === 0 ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.07)',
              borderLeft: i === 0 ? '3px solid rgba(251,191,36,0.7)' : undefined,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: '"Bebas Neue","Impact",sans-serif', fontSize: i === 0 ? 26 : 22, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 15px 0' }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>GESTION</div>
          </div>
          {navItems.map((item, i) => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 15px', cursor: 'pointer', background: 'transparent',
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
              border: 'none', borderTopColor: i === 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}15`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{item.icon}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
              <span style={{ color: item.color, opacity: 0.6, fontSize: 16 }}>›</span>
            </button>
          ))}
        </div>

      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`}</style>
    </div>
  )
}
