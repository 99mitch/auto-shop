import { useNavigate } from 'react-router-dom'
import CartIcon from '../components/CartIcon'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#050505', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 20% 60%, rgba(251,191,36,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 40%, rgba(34,211,238,0.06) 0%, transparent 70%)',
      }} />

      {/* Noise overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.03,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat', backgroundSize: '128px',
      }} />

      {/* Cart icon */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 50 }}>
        <CartIcon dark />
      </div>

      {/* Profile icon */}
      <button
        onClick={() => navigate('/profile')}
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 50,
          width: 36, height: 36, borderRadius: 9,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}
      >👤</button>

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '36px 0 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
          marginBottom: 10, fontFamily: '"JetBrains Mono", monospace',
        }}>
          marketplace
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 64, fontWeight: 900, lineHeight: 1,
          color: '#ffffff',
          fontFamily: '"Bebas Neue", "Impact", sans-serif',
          letterSpacing: '0.06em',
        }}>
          FULLZ
        </h1>
        <div style={{
          marginTop: 10, height: 1, width: 32,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        }} />
      </div>

      {/* Two CTA panels */}
      <div style={{
        position: 'relative', zIndex: 10,
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: '0 16px 20px', gap: 10,
      }}>

        {/* Cards panel */}
        <button
          onClick={() => navigate('/catalogue?type=cards')}
          className="panel-btn"
          style={{
            flex: 1, minHeight: 0,
            border: '1px solid rgba(251,191,36,0.18)',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.07) 0%, rgba(245,158,11,0.03) 100%)',
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
            width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Card illustration */}
          <div style={{
            position: 'absolute', top: 20, right: 20,
            display: 'flex', flexDirection: 'column', gap: 6,
            opacity: 0.55,
          }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                width: 72, height: 44,
                borderRadius: 7,
                border: '1px solid rgba(251,191,36,0.4)',
                background: i === 0
                  ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(180,120,10,0.08))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', padding: '6px 8px', gap: 3,
                transform: i === 1 ? 'translateX(10px) translateY(2px)' : 'none',
              }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[0,1,2,3].map(j => (
                    <div key={j} style={{ width: 7, height: 5, borderRadius: 1, background: 'rgba(251,191,36,0.4)' }} />
                  ))}
                </div>
                <div style={{ width: '60%', height: 3, borderRadius: 1, background: 'rgba(251,191,36,0.25)' }} />
              </div>
            ))}
          </div>

          {/* Text */}
          <div style={{ padding: '0 22px 22px', position: 'relative', zIndex: 2 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase',
              marginBottom: 6, fontFamily: '"JetBrains Mono", monospace',
            }}>
              Catégorie 01
            </div>
            <div style={{
              fontSize: 28, fontWeight: 900, color: '#ffffff', lineHeight: 1.05,
              fontFamily: '"Bebas Neue", "Impact", sans-serif', letterSpacing: '0.04em',
              marginBottom: 6,
            }}>
              Vente de Cartes
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
              CC, debit, prepaid &amp; full dumps
            </div>
            <div style={{
              marginTop: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.8)',
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
            }}>
              ACCÉDER →
            </div>
          </div>
        </button>

        {/* Digital data panel */}
        <button
          onClick={() => navigate('/catalogue?type=digital')}
          className="panel-btn"
          style={{
            flex: 1, minHeight: 0,
            border: '1px solid rgba(34,211,238,0.18)',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.07) 0%, rgba(6,182,212,0.03) 100%)',
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
            width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Data illustration */}
          <div style={{
            position: 'absolute', top: 16, right: 20,
            display: 'flex', flexDirection: 'column', gap: 4,
            opacity: 0.5,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 8, color: 'rgba(34,211,238,0.9)',
            lineHeight: 1.6,
          }}>
            {['NAME: J.MARTIN', 'DOB: 09/1987', 'SSN: 4●●-●●-7821', 'ADDR: 14 RUE DU…', 'SCORE: 742'].map((line, i) => (
              <div key={i} style={{ opacity: 1 - i * 0.12, animation: `dataFlicker 3s ${i * 0.6}s ease-in-out infinite` }}>
                {line}
              </div>
            ))}
          </div>

          {/* Text */}
          <div style={{ padding: '0 22px 22px', position: 'relative', zIndex: 2 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              color: 'rgba(34,211,238,0.6)', textTransform: 'uppercase',
              marginBottom: 6, fontFamily: '"JetBrains Mono", monospace',
            }}>
              Catégorie 02
            </div>
            <div style={{
              fontSize: 28, fontWeight: 900, color: '#ffffff', lineHeight: 1.05,
              fontFamily: '"Bebas Neue", "Impact", sans-serif', letterSpacing: '0.04em',
              marginBottom: 6,
            }}>
              Données Digitales
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
              Fullz, logs, comptes &amp; identités
            </div>
            <div style={{
              marginTop: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: 'rgba(34,211,238,0.8)',
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.1em',
            }}>
              ACCÉDER →
            </div>
          </div>
        </button>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');

        .panel-btn:active {
          transform: scale(0.985) !important;
        }
        @media (hover: hover) {
          .panel-btn:hover {
            transform: translateY(-2px);
          }
          .panel-btn:nth-child(1):hover {
            border-color: rgba(251,191,36,0.38) !important;
          }
          .panel-btn:nth-child(2):hover {
            border-color: rgba(34,211,238,0.38) !important;
          }
        }
        @keyframes dataFlicker {
          0%, 100% { opacity: 1; }
          45% { opacity: 0.7; }
          50% { opacity: 1; }
          55% { opacity: 0.6; }
          60% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
