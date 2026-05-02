import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton'

// ── Inlined types ────────────────────────────────────────────────────────────
interface CollabUser {
  id: number
  telegramId: string
  firstName: string
  lastName: string | null
  username: string | null
  photoUrl: string | null
  createdAt: string
  productCount: number
  totalEarnings: number
  totalPlatformFee: number
}

// ── Design tokens ────────────────────────────────────────────────────────────
const BG = '#050505'
const CARD_BG = '#111'
const CARD_BORDER = '1px solid rgba(255,255,255,0.07)'
const GOLD = '#fbbf24'
const SECONDARY_TEXT = 'rgba(255,255,255,0.3)'
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 8,
  letterSpacing: '0.22em',
  color: 'rgba(255,255,255,0.22)',
  fontFamily: '"JetBrains Mono", monospace',
  textTransform: 'uppercase' as const,
}
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }

export default function AdminCollaborators() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useTelegramBackButton(useCallback(() => navigate('/admin'), [navigate]))

  const [telegramId, setTelegramId] = useState('')
  const [addFeedback, setAddFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: collabs = [], isLoading } = useQuery<CollabUser[]>({
    queryKey: ['admin-collabs'],
    queryFn: () => api.get('/api/admin/collaborators').then((r) => r.data),
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addCollab = useMutation({
    mutationFn: (id: string) =>
      api.post('/api/admin/collaborators', { telegramId: id }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collabs'] })
      setTelegramId('')
      setAddFeedback({ ok: true, msg: 'Collaborateur ajouté.' })
      setTimeout(() => setAddFeedback(null), 3000)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Erreur lors de l\'ajout.'
      setAddFeedback({ ok: false, msg })
    },
  })

  const revokeCollab = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/collaborators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collabs'] })
      setConfirmRevoke(null)
    },
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: BG }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(5,5,5,0.95)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(251,191,36,0.15)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border: '1px solid rgba(251,191,36,0.2)',
            background: 'rgba(251,191,36,0.08)',
            color: 'rgba(251,191,36,0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
          }}
          aria-label="Retour"
        >
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 2 }}>PANNEAU ADMIN</div>
          <div style={{
            fontFamily: '"Bebas Neue", "Impact", sans-serif',
            fontSize: 20,
            letterSpacing: '0.06em',
            color: '#fff',
            lineHeight: 1,
          }}>
            COLLABORATEURS
          </div>
        </div>
        <div style={{
          ...MONO,
          fontSize: 11,
          color: GOLD,
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderRadius: 6,
          padding: '3px 8px',
        }}>
          {collabs.length}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '12px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>

        {/* Add section */}
        <div style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 14,
          padding: '14px 14px 12px',
        }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>AJOUTER UN COLLABORATEUR</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Telegram ID (ex: 123456789)"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && telegramId.trim()) addCollab.mutate(telegramId.trim())
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9,
                padding: '9px 12px',
                color: '#fff',
                fontSize: 13,
                ...MONO,
                outline: 'none',
              }}
            />
            <button
              onClick={() => { if (telegramId.trim()) addCollab.mutate(telegramId.trim()) }}
              disabled={addCollab.isPending || !telegramId.trim()}
              style={{
                background: addCollab.isPending ? 'rgba(251,191,36,0.3)' : GOLD,
                color: '#050505',
                border: 'none',
                borderRadius: 9,
                padding: '9px 16px',
                fontFamily: '"Bebas Neue", "Impact", sans-serif',
                fontSize: 14,
                letterSpacing: '0.08em',
                cursor: addCollab.isPending ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              {addCollab.isPending ? '...' : 'AJOUTER'}
            </button>
          </div>

          {addFeedback && (
            <div style={{
              marginTop: 8,
              fontSize: 12,
              ...MONO,
              color: addFeedback.ok ? '#4ade80' : '#ef4444',
              padding: '6px 10px',
              background: addFeedback.ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
              border: `1px solid ${addFeedback.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 7,
            }}>
              {addFeedback.msg}
            </div>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                background: CARD_BG,
                border: CARD_BORDER,
                borderRadius: 14,
                height: 88,
                opacity: 0.5,
              }} />
            ))}
          </div>
        ) : collabs.length === 0 ? (
          <div style={{
            background: CARD_BG,
            border: CARD_BORDER,
            borderRadius: 14,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ color: SECONDARY_TEXT, fontSize: 13, ...MONO }}>
              Aucun collaborateur pour l'instant.
            </div>
          </div>
        ) : (
          collabs.map((c) => (
            <CollabCard
              key={c.id}
              collab={c}
              isConfirming={confirmRevoke === c.id}
              isRevoking={revokeCollab.isPending && confirmRevoke === c.id}
              onRevokeClick={() => setConfirmRevoke(c.id)}
              onConfirm={() => revokeCollab.mutate(c.id)}
              onCancel={() => setConfirmRevoke(null)}
            />
          ))
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}

// ── CollabCard sub-component ──────────────────────────────────────────────────
interface CollabCardProps {
  collab: CollabUser
  isConfirming: boolean
  isRevoking: boolean
  onRevokeClick: () => void
  onConfirm: () => void
  onCancel: () => void
}

function CollabCard({ collab, isConfirming, isRevoking, onRevokeClick, onConfirm, onCancel }: CollabCardProps) {
  const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
  const LABEL_STYLE: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: '0.22em',
    color: 'rgba(255,255,255,0.22)',
    fontFamily: '"JetBrains Mono", monospace',
    textTransform: 'uppercase' as const,
  }

  return (
    <div style={{
      background: '#111',
      border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: '3px solid rgba(251,191,36,0.5)',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'rgba(251,191,36,0.1)',
        border: '1px solid rgba(251,191,36,0.2)',
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
      }}>
        {collab.photoUrl
          ? <img src={collab.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '👤'
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + username */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14, lineHeight: 1 }}>
            {collab.firstName}{collab.lastName ? ` ${collab.lastName}` : ''}
          </span>
          {collab.username && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', ...MONO }}>
              @{collab.username}
            </span>
          )}
        </div>

        {/* Row 2: Telegram ID */}
        <div style={{
          ...MONO,
          fontSize: 11,
          color: '#fbbf24',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.12)',
          borderRadius: 5,
          padding: '2px 7px',
          display: 'inline-block',
          marginBottom: 7,
        }}>
          {collab.telegramId}
        </div>

        {/* Row 3: stats chips */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <StatChip label={`${collab.productCount} cartes`} />
          <StatChip label={`€${collab.totalEarnings.toFixed(2)} gains`} accent />
          <StatChip label={`€${collab.totalPlatformFee.toFixed(2)} plateforme`} dim />
        </div>
      </div>

      {/* Revoke button / confirm */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        {!isConfirming ? (
          <button
            onClick={onRevokeClick}
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
              borderRadius: 7,
              padding: '5px 10px',
              fontSize: 10,
              fontFamily: '"Bebas Neue", "Impact", sans-serif',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            RÉVOQUER
          </button>
        ) : (
          <>
            <div style={{ ...LABEL_STYLE, color: '#ef4444', marginBottom: 3 }}>CONFIRMER ?</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={onConfirm}
                disabled={isRevoking}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#ef4444',
                  borderRadius: 7,
                  padding: '5px 10px',
                  fontSize: 10,
                  fontFamily: '"Bebas Neue", "Impact", sans-serif',
                  letterSpacing: '0.06em',
                  cursor: isRevoking ? 'not-allowed' : 'pointer',
                }}
              >
                {isRevoking ? '...' : 'OUI'}
              </button>
              <button
                onClick={onCancel}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                  borderRadius: 7,
                  padding: '5px 10px',
                  fontSize: 10,
                  fontFamily: '"Bebas Neue", "Impact", sans-serif',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                }}
              >
                NON
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatChip({ label, accent, dim }: { label: string; accent?: boolean; dim?: boolean }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 9,
      color: dim ? 'rgba(255,255,255,0.25)' : accent ? '#4ade80' : 'rgba(255,255,255,0.45)',
      background: dim
        ? 'rgba(255,255,255,0.03)'
        : accent
          ? 'rgba(34,197,94,0.07)'
          : 'rgba(255,255,255,0.05)',
      border: `1px solid ${dim ? 'rgba(255,255,255,0.06)' : accent ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 5,
      padding: '2px 6px',
    }}>
      {label}
    </span>
  )
}
