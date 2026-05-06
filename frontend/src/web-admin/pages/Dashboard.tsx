import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

type Period = 'day' | 'week' | 'month'
const PERIOD_LABELS: Record<Period, string> = { day: "AUJOURD'HUI", week: 'SEMAINE', month: 'MOIS' }

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('day')

  const { data } = useQuery({
    queryKey: ['web-admin-stats', period],
    queryFn: () => adminApi.get(`/api/web-admin/stats?period=${period}`).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const periodCards = [
    { label: 'REVENUS', value: `€${(data?.currentPeriod?.revenue ?? 0).toFixed(2)}`, sub: `${data?.currentPeriod?.orders ?? 0} commandes` },
    { label: 'CARTES VENDUES', value: String(data?.currentPeriod?.cardsSold ?? '—'), sub: 'unités écoulées' },
    { label: 'DÉPÔTS', value: `€${(data?.currentPeriod?.deposits ?? 0).toFixed(2)}`, sub: 'rechargements validés' },
  ]

  const globalCards = [
    { label: 'CA TOTAL', value: `€${(data?.allTime?.revenue ?? 0).toFixed(2)}`, sub: `${data?.allTime?.orders ?? 0} commandes`, accent: true },
    { label: 'CARTES EN VENTE', value: String(data?.activeCards ?? '—'), sub: 'dans le catalogue' },
    { label: 'UTILISATEURS', value: String(data?.allTime?.users ?? '—'), sub: 'sur le bot' },
    { label: 'DÉPÔTS TOTAUX', value: `€${(data?.allTime?.deposits ?? 0).toFixed(2)}`, sub: 'all time' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff', lineHeight: 1 }}>TABLEAU DE BORD</h1>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4, letterSpacing: '0.1em' }}>STATISTIQUES GÉNÉRALES</p>
      </div>

      {/* Global KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {globalCards.map((c, i) => (
          <div key={i} style={{
            background: '#111', borderRadius: 14, padding: '16px 18px',
            border: c.accent ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.07)',
            borderLeft: c.accent ? '3px solid rgba(251,191,36,0.7)' : undefined,
          }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: c.accent ? 30 : 24, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Period selector + cards */}
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: period === p ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
              color: period === p ? '#fbbf24' : 'rgba(255,255,255,0.35)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono",monospace',
              outline: period === p ? '1px solid rgba(251,191,36,0.4)' : 'none',
            }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {periodCards.map((c, i) => (
            <div key={i} style={{ background: '#111', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 26, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
