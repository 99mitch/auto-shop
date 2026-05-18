interface LogoProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export default function Logo({ size = 48, className, style }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="60%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#141414" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <radialGradient id="logo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Card background */}
      <rect x="2" y="2" width="60" height="60" rx="12" ry="12" fill="url(#logo-bg)" />
      <rect x="2" y="2" width="60" height="60" rx="12" ry="12" fill="none" stroke="url(#logo-gold)" strokeWidth="1.4" strokeOpacity="0.65" />

      {/* Ambient glow */}
      <ellipse cx="32" cy="32" rx="22" ry="22" fill="url(#logo-glow)" />

      {/* 4-pointed sparkle star — joker symbol */}
      <path d="M32 11 Q34.5 28.5 53 32 Q34.5 35.5 32 53 Q29.5 35.5 11 32 Q29.5 28.5 32 11 Z" fill="url(#logo-gold)" opacity="0.95" />

      {/* Center accent */}
      <path d="M32 27 L35 32 L32 37 L29 32 Z" fill="#050505" opacity="0.5" />
      <circle cx="32" cy="32" r="2.2" fill="#FFD700" opacity="0.8" />

      {/* Corner J — top left */}
      <text x="7" y="17.5" fontFamily="Georgia, 'Times New Roman', serif" fontSize="11" fontWeight="bold" fill="#FBBF24" fillOpacity="0.9">J</text>
      {/* Corner J — bottom right */}
      <text x="57" y="46.5" fontFamily="Georgia, 'Times New Roman', serif" fontSize="11" fontWeight="bold" fill="#FBBF24" fillOpacity="0.9" textAnchor="middle" transform="rotate(180,57,46.5)">J</text>

      {/* Star pips */}
      <path d="M9.5 21 L10.3 23.4 L12.8 23.4 L10.8 24.9 L11.5 27.3 L9.5 25.8 L7.5 27.3 L8.2 24.9 L6.2 23.4 L8.7 23.4 Z" fill="#FBBF24" fillOpacity="0.45" transform="scale(0.65) translate(7,13)" />
      <path d="M9.5 21 L10.3 23.4 L12.8 23.4 L10.8 24.9 L11.5 27.3 L9.5 25.8 L7.5 27.3 L8.2 24.9 L6.2 23.4 L8.7 23.4 Z" fill="#FBBF24" fillOpacity="0.45" transform="rotate(180,32,32) scale(0.65) translate(7,13)" />
    </svg>
  )
}
