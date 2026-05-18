import { useEffect } from 'react'

interface Props {
  onDone: () => void
}

function Chip() {
  return (
    <svg width="44" height="34" viewBox="0 0 44 34" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chip-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a017"/>
          <stop offset="30%" stopColor="#f5c842"/>
          <stop offset="60%" stopColor="#c8890a"/>
          <stop offset="100%" stopColor="#e8b820"/>
        </linearGradient>
        <linearGradient id="chip-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)"/>
          <stop offset="50%" stopColor="rgba(255,255,255,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)"/>
        </linearGradient>
      </defs>
      {/* Base gold */}
      <rect x="0" y="0" width="44" height="34" rx="5" fill="url(#chip-bg)"/>
      {/* Shine overlay */}
      <rect x="0" y="0" width="44" height="34" rx="5" fill="url(#chip-shine)"/>
      {/* Contact grid lines */}
      <line x1="0" y1="11" x2="44" y2="11" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8"/>
      <line x1="0" y1="23" x2="44" y2="23" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8"/>
      <line x1="15" y1="0" x2="15" y2="34" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
      <line x1="29" y1="0" x2="29" y2="34" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
      {/* Center contact area */}
      <rect x="15" y="11" width="14" height="12" fill="rgba(0,0,0,0.18)" rx="1"/>
      {/* Top-left segment */}
      <rect x="2" y="2" width="11" height="7" rx="2" fill="rgba(0,0,0,0.12)"/>
      {/* Top-right segment */}
      <rect x="31" y="2" width="11" height="7" rx="2" fill="rgba(0,0,0,0.12)"/>
      {/* Bottom-left segment */}
      <rect x="2" y="25" width="11" height="7" rx="2" fill="rgba(0,0,0,0.12)"/>
      {/* Bottom-right segment */}
      <rect x="31" y="25" width="11" height="7" rx="2" fill="rgba(0,0,0,0.12)"/>
    </svg>
  )
}

function JokerStar({ size = 36, opacity = 1 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
      <defs>
        <linearGradient id="star-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="60%" stopColor="#FBBF24"/>
          <stop offset="100%" stopColor="#B8860B"/>
        </linearGradient>
      </defs>
      <path d="M32 4 Q35 28 60 32 Q35 36 32 60 Q29 36 4 32 Q29 28 32 4 Z" fill="url(#star-gold)"/>
      <circle cx="32" cy="32" r="3" fill="#FFD700" opacity="0.7"/>
    </svg>
  )
}

function CardFront() {
  return (
    <div style={{
      width: 300, height: 190,
      borderRadius: 16,
      background: 'linear-gradient(135deg, #0e0e0e 0%, #1a1205 40%, #0c0c0c 100%)',
      border: '1px solid rgba(251,191,36,0.25)',
      boxShadow: '0 0 0 1px rgba(251,191,36,0.1), inset 0 1px 0 rgba(255,255,255,0.04)',
      position: 'relative',
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
    }}>
      {/* Holographic shimmer band */}
      <div style={{
        position: 'absolute', top: 0, left: '-100%', right: '-100%', height: '100%',
        background: 'linear-gradient(105deg, transparent 35%, rgba(251,191,36,0.06) 50%, transparent 65%)',
        animation: 'shimmer 3.5s linear infinite',
        pointerEvents: 'none',
      }}/>

      {/* Ambient glow top-right */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Ambient glow bottom-left */}
      <div style={{
        position: 'absolute', bottom: -20, left: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Background watermark suits */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 120, color: 'rgba(251,191,36,0.025)',
        userSelect: 'none', pointerEvents: 'none',
        fontFamily: 'serif',
      }}>♦</div>

      {/* Top row: chip + brand */}
      <div style={{
        position: 'absolute', top: 18, left: 18, right: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Chip />
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: '"Bebas Neue", "Impact", sans-serif',
            fontSize: 18, letterSpacing: '0.15em',
            color: 'rgba(251,191,36,0.9)',
            lineHeight: 1,
          }}>FULLZ</div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 7, letterSpacing: '0.2em',
            color: 'rgba(251,191,36,0.4)',
            marginTop: 2,
          }}>WILD CARD</div>
        </div>
      </div>

      {/* Joker symbol — center right */}
      <div style={{
        position: 'absolute', top: 18, right: 18,
        display: 'none',
      }}>
        <JokerStar size={28} />
      </div>

      {/* Embossed card number */}
      <div style={{
        position: 'absolute', left: 18, right: 18, bottom: 52,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 17, letterSpacing: '0.22em', fontWeight: 700,
        color: 'rgba(220,180,60,0.95)',
        textShadow: '0 1px 0 rgba(255,255,255,0.1), 0 -1px 0 rgba(0,0,0,0.7), 0 0 12px rgba(251,191,36,0.25)',
        display: 'flex', gap: 14,
      }}>
        <span>♠ ●●●●</span>
        <span>●●●●</span>
        <span>●●●●</span>
        <span style={{ color: 'rgba(251,191,36,1)' }}>J0K3R</span>
      </div>

      {/* Bottom row: name + valid + star */}
      <div style={{
        position: 'absolute', left: 18, right: 18, bottom: 14,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 7, letterSpacing: '0.2em',
            color: 'rgba(251,191,36,0.35)', marginBottom: 3,
          }}>CARDHOLDER</div>
          <div style={{
            fontFamily: '"Bebas Neue", "Impact", sans-serif',
            fontSize: 14, letterSpacing: '0.12em',
            color: 'rgba(220,180,60,0.85)',
            textShadow: '0 1px 0 rgba(255,255,255,0.08), 0 0 8px rgba(251,191,36,0.2)',
          }}>CARTE JOKER</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 7, letterSpacing: '0.2em',
            color: 'rgba(251,191,36,0.35)', marginBottom: 3,
          }}>VALID THRU</div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, letterSpacing: '0.1em',
            color: 'rgba(220,180,60,0.8)',
            textShadow: '0 1px 0 rgba(255,255,255,0.08)',
          }}>∞ / ∞</div>
        </div>
        <JokerStar size={32} />
      </div>

      {/* Magnetic stripe mock — subtle */}
      <div style={{
        position: 'absolute', top: 70, left: 0, right: 0, height: 2,
        background: 'rgba(251,191,36,0.04)',
      }}/>
    </div>
  )
}

function CardBack() {
  return (
    <div style={{
      width: 300, height: 190,
      borderRadius: 16,
      background: 'linear-gradient(135deg, #0a0a0a 0%, #111108 50%, #0a0a0a 100%)',
      border: '1px solid rgba(251,191,36,0.2)',
      position: 'absolute', inset: 0,
      transform: 'rotateY(180deg)',
      backfaceVisibility: 'hidden',
      overflow: 'hidden',
    }}>
      {/* Diagonal stripe pattern */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diag" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(251,191,36,0.07)" strokeWidth="6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag)"/>
      </svg>

      {/* Center joker star large */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <JokerStar size={64} opacity={0.75}/>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9, letterSpacing: '0.35em',
          color: 'rgba(251,191,36,0.3)',
        }}>♠ FULLZ MARKETPLACE ♦</div>
      </div>

      {/* Corner suit marks */}
      {['♠','♦','♣','♥'].map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: i < 2 ? 10 : undefined, bottom: i >= 2 ? 10 : undefined,
          left: i % 2 === 0 ? 12 : undefined, right: i % 2 === 1 ? 12 : undefined,
          fontSize: 14, color: 'rgba(251,191,36,0.18)',
          fontFamily: 'serif',
        }}>{s}</div>
      ))}
    </div>
  )
}

export default function Splash({ onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      background: '#050505',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 36,
      animation: 'splash-fade 3s ease-out forwards',
    }}>
      {/* 3D card wrapper */}
      <div style={{ perspective: '900px' }}>
        <div style={{
          width: 300, height: 190,
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: 'card-spin 3s linear infinite',
        }}>
          <CardFront />
          <CardBack />
        </div>
      </div>

      {/* Brand */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Bebas Neue", "Impact", sans-serif',
          fontSize: 52, fontWeight: 900, lineHeight: 1,
          color: '#ffffff', letterSpacing: '0.1em',
        }}>FULLZ</div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10, letterSpacing: '0.35em',
          color: 'rgba(251,191,36,0.4)',
          marginTop: 6,
        }}>MARKETPLACE</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@700&display=swap');

        @keyframes card-spin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }

        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @keyframes splash-fade {
          0%, 75% { opacity: 1; }
          100%     { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
