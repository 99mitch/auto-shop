import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#fbbf24',
  COLLABORATOR: '#4ade80',
  CUSTOMER: 'rgba(255,255,255,0.25)',
}

export default function Users() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBalance, setEditBalance] = useState('')
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['web-admin-users', search, page],
    queryFn: () => adminApi.get(`/api/web-admin/users?search=${encodeURIComponent(search)}&page=${page}`).then((r) => r.data),
    staleTime: 15_000,
  })

  const patchUser = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => adminApi.patch(`/api/web-admin/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['web-admin-users'] }); setEditingId(null) },
  })

  const users: any[] = data?.users ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff' }}>UTILISATEURS</h1>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>{data?.total ?? 0} membres enregistrés</p>
        </div>
        <input
          placeholder="Recherche…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, outline: 'none', width: 220 }}
        />
      </div>

      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {['UTILISATEUR', 'RÔLE', 'SOLDE', 'COMMANDES', 'DÉPENSÉ', 'ACTIONS'].map((h) => (
            <div key={h} style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace' }}>{h}</div>
          ))}
        </div>

        {users.map((u, i) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', padding: '12px 16px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontSize: 12, color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontWeight: 700 }}>{u.firstName} {u.lastName ?? ''}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>@{u.username ?? u.telegramId}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: ROLE_COLORS[u.role] ?? '#fff', letterSpacing: '0.1em', fontFamily: '"JetBrains Mono",monospace' }}>{u.role}</div>
            <div>
              {editingId === u.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="number"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    style={{ width: 70, background: '#1a1a1a', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 6, padding: '4px 6px', color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, outline: 'none' }}
                  />
                  <button onClick={() => patchUser.mutate({ id: u.id, body: { balance: parseFloat(editBalance) } })}
                    style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', cursor: 'pointer', fontSize: 10 }}>✓</button>
                </div>
              ) : (
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: '#fbbf24' }}>€{u.balance.toFixed(2)}</span>
              )}
            </div>
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{u.orderCount}</div>
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>€{u.totalSpent.toFixed(2)}</div>
            <div>
              <button onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditBalance(String(u.balance)) }}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.06)', color: 'rgba(251,191,36,0.8)', cursor: 'pointer', fontSize: 9, fontFamily: '"JetBrains Mono",monospace' }}>
                €
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>
            Aucun utilisateur trouvé
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.pages ?? 0) > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {Array.from({ length: data.pages }, (_: unknown, i: number) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: page === p ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
              color: page === p ? '#fbbf24' : 'rgba(255,255,255,0.4)',
              fontFamily: '"JetBrains Mono",monospace', fontSize: 11,
            }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
