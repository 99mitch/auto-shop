import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

interface OrderFile {
  id: number; fileType: 'BRUT' | 'SPECIAL_TXT' | 'SPECIAL_XLSX'; filename: string; partNumber: number | null; createdAt: string
}
interface DataOrder {
  id: number; type: string; status: string; withNames: boolean; lineCount: number; createdAt: string
  files: OrderFile[]
}

const TYPE_ACCENT: Record<string, string> = {
  FICHE: '#22d3ee', NUMLIST: '#a78bfa', MAILLIST: '#f472b6',
}

function fmt(n: number) { return n.toLocaleString('fr-FR') }

function OrderCard({ order }: { order: DataOrder }) {
  const accent   = TYPE_ACCENT[order.type] ?? '#fff'
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  const sendMutation = useMutation({
    mutationFn: () => api.post(`/api/data-orders/${order.id}/send-telegram`),
    onMutate:  () => setSending(true),
    onSettled: () => setSending(false),
    onSuccess: () => setSent(true),
  })

  const downloadFile = (file: OrderFile) => {
    api.get(`/api/data-orders/${order.id}/download/${file.id}`, { responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(new Blob([res.data]))
        const a   = document.createElement('a')
        a.href     = url
        a.download = file.filename
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: '#111', borderRadius: 14, border: `1px solid ${accent}22`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: accent, letterSpacing: '0.06em' }}>{order.type}</div>
            {order.withNames && (
              <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,180,0,0.7)', letterSpacing: '0.1em', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 4, padding: '1px 5px' }}>+NOM/PRÉNOM</div>
            )}
          </div>
          <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{date} à {time}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 22, color: accent, lineHeight: 1 }}>{fmt(order.lineCount)}</div>
          <div style={{ fontSize: 6, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>LIGNES</div>
        </div>
      </div>

      {/* Files */}
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {order.files.map((f) => {
          const icon  = f.fileType === 'BRUT' ? '📄' : f.fileType === 'SPECIAL_TXT' ? '📞' : '📊'
          const label = f.fileType === 'BRUT' ? 'FICHIER BRUT' : f.fileType === 'SPECIAL_TXT' ? 'FICHE A CALL' : 'FORMAT SENDER BOBBY'
          const part  = f.partNumber ? ` • Partie ${f.partNumber}` : ''
          return (
            <button key={f.id} onClick={() => downloadFile(f)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9, padding: '8px 12px', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
                    {label}{part}
                  </div>
                  <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{f.filename}</div>
                </div>
              </div>
              <span style={{ fontSize: 10, color: accent, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>↓</span>
            </button>
          )
        })}
      </div>

      {/* Send via Telegram */}
      <div style={{ padding: '0 14px 12px' }}>
        <button
          onClick={() => !sent && sendMutation.mutate()}
          disabled={sending || sent}
          style={{
            width: '100%', height: 36, borderRadius: 9,
            border: sent ? '1px solid rgba(34,197,94,0.4)' : `1px solid ${accent}33`,
            background: sent ? 'rgba(34,197,94,0.08)' : `${accent}0a`,
            color: sent ? '#4ade80' : accent,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.1em', cursor: sending || sent ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {sent ? '✓ ENVOYÉ SUR TELEGRAM' : sending ? 'ENVOI EN COURS…' : '✈ RECEVOIR SUR TELEGRAM'}
        </button>
      </div>
    </div>
  )
}

export default function MesCommandesDonnees() {
  const navigate = useNavigate()
  useTelegramBackButton(() => navigate('/profile'))

  const { data: orders = [], isLoading } = useQuery<DataOrder[]>({
    queryKey: ['data-orders'],
    queryFn: () => api.get('/api/data-orders').then((r) => r.data),
    staleTime: 10_000,
  })

  return (
    <div style={{ background: '#050505', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/profile')} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ fontSize: 7, fontFamily: '"JetBrains Mono", monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>DONNÉES</div>
          <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, color: '#fff', letterSpacing: '0.06em', lineHeight: 1.1 }}>MES EXTRACTIONS</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 12px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          [1,2,3].map((i) => (
            <div key={i} style={{ height: 160, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))
        ) : orders.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontSize: 32 }}>📭</div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Aucune extraction pour le moment
            </div>
            <button onClick={() => navigate('/donnees')} style={{ marginTop: 8, padding: '8px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }}>
              FAIRE UNE EXTRACTION →
            </button>
          </div>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
      `}</style>
    </div>
  )
}
