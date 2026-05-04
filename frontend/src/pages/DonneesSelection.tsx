import { useNavigate } from 'react-router-dom'
import { useTelegramBackButton } from '../hooks/useTelegramBackButton'

const TYPES = [
  {
    key: 'fiche',
    label: 'Fiche',
    sub: 'Profil individuel complet',
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.15)',
    border: 'rgba(34,211,238,0.2)',
    bg: 'rgba(34,211,238,0.06)',
    cat: '01',
    illustration: ['NAME: J.MARTIN', 'DOB: 09/1987', 'TEL: 06●●●●4821', 'ADDR: 14 RUE DU…', 'MAIL: j.mart@…'],
  },
  {
    key: 'numlist',
    label: 'Numlist',
    sub: 'Listes de numéros de téléphone',
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    border: 'rgba(167,139,250,0.2)',
    bg: 'rgba(167,139,250,0.06)',
    cat: '02',
    illustration: ['+336●●●●4821', '+336●●●●1043', '+336●●●●7752', '+336●●●●3390', '+336●●●●6614'],
  },
  {
    key: 'maillist',
    label: 'Maillist',
    sub: 'Listes d\'adresses email',
    accent: '#f472b6',
    glow: 'rgba(244,114,182,0.15)',
    border: 'rgba(244,114,182,0.2)',
    bg: 'rgba(244,114,182,0.06)',
    cat: '03',
    illustration: ['j.martin@gmail…', 'sophie.d@free…', 'pierre.v@sfr…', 'marie.l@orange…', 'thomas.b@hot…'],
  },
]

export default function DonneesSelection() {
  const navigate = useNavigate()
  useTelegramBackButton(() => navigate('/'))

  return (
    <div style={{
      background: '#050505', height: '100vh',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
    }}>

      {/* Ambient glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 30% 50%, rgba(34,211,238,0.05) 0%, transparent 70%), radial-gradient(ellipse 50% 35% at 75% 60%, rgba(167,139,250,0.05) 0%, transparent 70%)',
      }} />

      {/* Noise overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.03,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat', backgroundSize: '128px',
      }} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 10, padding: '36px 0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
          marginBottom: 10, fontFamily: '"JetBrains Mono", monospace',
        }}>
          données digitales
        </div>
        <h1 style={{
          margin: 0, fontSize: 52, fontWeight: 900, lineHeight: 1,
          color: '#ffffff', fontFamily: '"Bebas Neue", "Impact", sans-serif',
          letterSpacing: '0.06em',
        }}>
          CHOISIR LE TYPE
        </h1>
        <div style={{ marginTop: 10, height: 1, width: 32, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
      </div>

      {/* 3 panels */}
      <div style={{
        position: 'relative', zIndex: 10,
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: '0 16px 20px', gap: 10,
      }}>
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/catalogue?type=${t.key}`)}
            className="panel-btn"
            style={{
              flex: 1, minHeight: 0,
              border: `1px solid ${t.border}`,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${t.bg} 0%, transparent 100%)`,
              cursor: 'pointer', padding: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', justifyContent: 'flex-end',
              overflow: 'hidden', position: 'relative',
              textAlign: 'left',
              transition: 'border-color 0.25s, transform 0.18s',
            }}
          >
            {/* Corner glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`,
              pointerEvents: 'none',
            }} />

            {/* Illustration */}
            <div style={{
              position: 'absolute', top: 14, right: 20,
              display: 'flex', flexDirection: 'column', gap: 3,
              opacity: 0.5,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 8, color: t.accent,
              lineHeight: 1.6,
            }}>
              {t.illustration.map((line, i) => (
                <div key={i} style={{ opacity: 1 - i * 0.13 }}>{line}</div>
              ))}
            </div>

            {/* Text */}
            <div style={{ padding: '0 20px 18px', position: 'relative', zIndex: 2 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
                color: `${t.accent}99`, textTransform: 'uppercase',
                marginBottom: 4, fontFamily: '"JetBrains Mono", monospace',
              }}>
                Catégorie {t.cat}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 900, color: '#ffffff', lineHeight: 1.05,
                fontFamily: '"Bebas Neue", "Impact", sans-serif', letterSpacing: '0.04em',
                marginBottom: 4,
              }}>
                {t.label}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
                {t.sub}
              </div>
              <div style={{
                marginTop: 12,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, color: `${t.accent}cc`,
                fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
              }}>
                ACCÉDER →
              </div>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
        .panel-btn:active { transform: scale(0.985) !important; }
        @media (hover: hover) {
          .panel-btn:hover { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  )
}
