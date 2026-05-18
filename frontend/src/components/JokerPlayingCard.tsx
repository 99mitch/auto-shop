interface Props {
  width?: number
  spinDuration?: string
}

const W = 76
const H = 106

function CardFace() {
  return (
    <svg
      width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="jc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#131310"/>
          <stop offset="100%" stopColor="#070705"/>
        </linearGradient>
        <linearGradient id="jc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="55%" stopColor="#FBBF24"/>
          <stop offset="100%" stopColor="#B8860B"/>
        </linearGradient>
        <radialGradient id="jc-glow" cx="50%" cy="48%" r="45%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
        </radialGradient>
        <filter id="jc-emboss">
          <feDropShadow dx="0" dy="1" stdDeviation="0.5" floodColor="#FFD700" floodOpacity="0.35"/>
        </filter>
      </defs>

      {/* Card body */}
      <rect x="0.5" y="0.5" width={W-1} height={H-1} rx="7" fill="url(#jc-bg)"/>
      {/* Gold border */}
      <rect x="0.5" y="0.5" width={W-1} height={H-1} rx="7" fill="none" stroke="url(#jc-gold)" strokeWidth="1.2" strokeOpacity="0.6"/>
      {/* Inner thin border — playing card look */}
      <rect x="3.5" y="3.5" width={W-7} height={H-7} rx="5" fill="none" stroke="rgba(251,191,36,0.12)" strokeWidth="0.6"/>

      {/* Ambient center glow */}
      <ellipse cx="38" cy="51" rx="28" ry="28" fill="url(#jc-glow)"/>

      {/* ── TOP-LEFT CORNER ── */}
      {/* Rank J */}
      <text x="7" y="17" fontFamily="Georgia,'Times New Roman',serif" fontSize="13" fontWeight="bold"
        fill="#FBBF24" fillOpacity="0.95">J</text>
      {/* Star pip under J */}
      <path d="M10 19.5 Q11 22.5 14 23.5 Q11 24.5 10 27.5 Q9 24.5 6 23.5 Q9 22.5 10 19.5 Z"
        fill="#FBBF24" fillOpacity="0.7"/>

      {/* ── CENTER JOKER MOTIF ── */}

      {/* Decorative arc top */}
      <path d="M 22 36 Q 38 28 54 36" fill="none" stroke="rgba(251,191,36,0.2)" strokeWidth="0.7"/>

      {/* 4-pointed sparkle — main joker symbol */}
      <path d="M38 28 Q40 40 52 42 Q40 44 38 56 Q36 44 24 42 Q36 40 38 28 Z"
        fill="url(#jc-gold)" filter="url(#jc-emboss)"/>
      {/* Center dot */}
      <circle cx="38" cy="42" r="2" fill="#FFD700" opacity="0.85"/>

      {/* Suit symbols at cardinal points around the star */}
      <text x="38" y="25" textAnchor="middle" fontFamily="serif" fontSize="7"
        fill="#FBBF24" fillOpacity="0.55">♠</text>
      <text x="57" y="44" textAnchor="middle" fontFamily="serif" fontSize="7"
        fill="#FBBF24" fillOpacity="0.55">♦</text>
      <text x="38" y="62" textAnchor="middle" fontFamily="serif" fontSize="7"
        fill="#FBBF24" fillOpacity="0.55">♣</text>
      <text x="19" y="44" textAnchor="middle" fontFamily="serif" fontSize="7"
        fill="#FBBF24" fillOpacity="0.55">♥</text>

      {/* Decorative arc bottom */}
      <path d="M 22 62 Q 38 70 54 62" fill="none" stroke="rgba(251,191,36,0.2)" strokeWidth="0.7"/>

      {/* JOKER text */}
      <text x="38" y="78" textAnchor="middle"
        fontFamily="'JetBrains Mono',monospace" fontSize="8.5" fontWeight="bold" letterSpacing="3.5"
        fill="#FBBF24" fillOpacity="0.9">JOKER</text>

      {/* Divider line */}
      <line x1="16" y1="81" x2="60" y2="81" stroke="rgba(251,191,36,0.18)" strokeWidth="0.5"/>

      {/* Small repeating star pattern between divider and corner */}
      <text x="27" y="90" textAnchor="middle" fontFamily="serif" fontSize="6"
        fill="#FBBF24" fillOpacity="0.25">✦</text>
      <text x="38" y="90" textAnchor="middle" fontFamily="serif" fontSize="6"
        fill="#FBBF24" fillOpacity="0.35">✦</text>
      <text x="49" y="90" textAnchor="middle" fontFamily="serif" fontSize="6"
        fill="#FBBF24" fillOpacity="0.25">✦</text>

      {/* ── BOTTOM-RIGHT CORNER (rotated 180°) ── */}
      <g transform={`rotate(180,${W/2},${H/2})`}>
        <text x="7" y="17" fontFamily="Georgia,'Times New Roman',serif" fontSize="13" fontWeight="bold"
          fill="#FBBF24" fillOpacity="0.95">J</text>
        <path d="M10 19.5 Q11 22.5 14 23.5 Q11 24.5 10 27.5 Q9 24.5 6 23.5 Q9 22.5 10 19.5 Z"
          fill="#FBBF24" fillOpacity="0.7"/>
      </g>
    </svg>
  )
}

function CardBack() {
  return (
    <svg
      width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
    >
      <defs>
        <linearGradient id="jcb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0e0e0b"/>
          <stop offset="100%" stopColor="#050503"/>
        </linearGradient>
        <pattern id="jcb-diag" x="0" y="0" width="14" height="14"
          patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="none"/>
          <line x1="7" y1="0" x2="7" y2="14" stroke="rgba(251,191,36,0.09)" strokeWidth="5"/>
        </pattern>
        <pattern id="jcb-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="0.8" fill="rgba(251,191,36,0.12)"/>
        </pattern>
        <linearGradient id="jcb-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="100%" stopColor="#B8860B"/>
        </linearGradient>
      </defs>

      {/* Card body */}
      <rect x="0.5" y="0.5" width={W-1} height={H-1} rx="7" fill="url(#jcb-bg)"/>
      {/* Diagonal stripe pattern */}
      <rect x="0.5" y="0.5" width={W-1} height={H-1} rx="7" fill="url(#jcb-diag)"/>
      {/* Dot grid overlay */}
      <rect x="0.5" y="0.5" width={W-1} height={H-1} rx="7" fill="url(#jcb-dots)"/>
      {/* Border */}
      <rect x="0.5" y="0.5" width={W-1} height={H-1} rx="7" fill="none"
        stroke="url(#jcb-gold)" strokeWidth="1.2" strokeOpacity="0.5"/>
      {/* Inner border */}
      <rect x="4" y="4" width={W-8} height={H-8} rx="5" fill="none"
        stroke="rgba(251,191,36,0.1)" strokeWidth="0.5"/>

      {/* Center large star */}
      <path d={`M${W/2} ${H/2-18} Q${W/2+4} ${H/2} ${W/2+18} ${H/2} Q${W/2+4} ${H/2} ${W/2} ${H/2+18} Q${W/2-4} ${H/2} ${W/2-18} ${H/2} Q${W/2-4} ${H/2} ${W/2} ${H/2-18} Z`}
        fill="url(#jcb-gold)" opacity="0.55"/>
      <circle cx={W/2} cy={H/2} r="2.5" fill="#FFD700" opacity="0.6"/>

      {/* Corner diamonds */}
      {[[10,10],[W-10,10],[10,H-10],[W-10,H-10]].map(([x,y],i) => (
        <path key={i} d={`M${x} ${y-4} L${x+3} ${y} L${x} ${y+4} L${x-3} ${y} Z`}
          fill="#FBBF24" fillOpacity="0.25"/>
      ))}
    </svg>
  )
}

export default function JokerPlayingCard({ width = W, spinDuration = '4s' }: Props) {
  const scale = width / W

  return (
    <>
      {/* Scale wrapper — never conflicts with the rotation animation */}
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', lineHeight: 0 }}>
        {/* Perspective container */}
        <div style={{ perspective: '700px' }}>
          {/* Spinning element — transform-origin defaults to 50% 50% (center) */}
          <div style={{
            width: W, height: H,
            position: 'relative',
            transformStyle: 'preserve-3d',
            animation: `joker-spin ${spinDuration} linear infinite`,
          }}>
            {/* Front */}
            <div style={{ backfaceVisibility: 'hidden', width: W, height: H }}>
              <CardFace />
            </div>
            {/* Back */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              width: W, height: H,
            }}>
              <CardBack />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes joker-spin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
    </>
  )
}
