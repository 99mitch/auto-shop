// Visuel "carte de crédit" + récap de toutes les infos extraites
// Utilisé dans les écrans d'ajout de cartes (TXT et bot) pour permettre
// au collaborateur de valider visuellement avant confirmation.

export interface ParsedCard {
  numero?: string
  expiration?: string
  cvv?: string
  titulaire?: string
  ddn?: string
  adresse?: string
  ville?: string
  email?: string
  telephone?: string
  ip?: string
}

type Network = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

export function parseCardFull(raw: string): ParsedCard {
  const line = raw.trim()
  const result: ParsedCard = {}

  // Déjà du JSON ?
  try {
    const j = JSON.parse(line)
    if (j && typeof j === 'object' && (j.numero || j.pan)) {
      return {
        numero: j.numero ?? j.pan,
        expiration: j.expiration ?? j.exp,
        cvv: j.cvv,
        titulaire: j.titulaire ?? j.nom,
        ddn: j.ddn,
        adresse: j.adresse,
        ville: j.ville,
        email: j.email,
        telephone: j.telephone ?? j.tel,
        ip: j.ip,
      }
    }
  } catch {}

  // Format pipe : pan|expiry|cvv|titulaire|ddn|adresse|ville|email|tel|ip
  const parts = line.split('|').map(p => p.trim())
  if (parts.length >= 3) {
    if (/^\d{13,19}$/.test(parts[0])) result.numero = parts[0]
    if (/^\d{2}\/\d{2,4}$/.test(parts[1])) result.expiration = parts[1]
    if (/^\d{3,4}$/.test(parts[2])) result.cvv = parts[2]
    if (parts[3]) result.titulaire = parts[3]
    if (parts[4]) result.ddn = parts[4]
    if (parts[5]) result.adresse = parts[5]
    if (parts[6]) result.ville = parts[6]
    if (parts[7]) {
      if (parts[7].includes('@')) result.email = parts[7]
      else result.telephone = parts[7]
    }
    if (parts[8]) {
      if (parts[8].includes('@')) result.email = parts[8]
      else if (!result.telephone) result.telephone = parts[8]
    }
    if (parts[9]) result.ip = parts[9]
    if (parts[10]) result.ip = parts[10]
  }

  // Fallbacks regex pour combler les trous
  if (!result.email) {
    const m = line.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/); if (m) result.email = m[0]
  }
  if (!result.ip) {
    const m = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/); if (m) result.ip = m[0]
  }
  if (!result.numero) {
    const m = line.match(/\b\d{13,19}\b/); if (m) result.numero = m[0]
  }
  if (!result.expiration) {
    const m = line.match(/\b\d{2}\/\d{2,4}\b/); if (m) result.expiration = m[0]
  }
  return result
}

function detectNetwork(bin: string): Network {
  const b0 = bin[0]
  if (b0 === '4') return 'VISA'
  if (b0 === '5') return 'MASTERCARD'
  if (b0 === '3') return 'AMEX'
  return 'OTHER'
}

function formatPan(pan: string): string {
  return pan.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const NETWORK_GRADIENT: Record<Network, string> = {
  VISA: 'linear-gradient(135deg, #1a1f4d 0%, #2a3370 50%, #0d1233 100%)',
  MASTERCARD: 'linear-gradient(135deg, #4d1a1a 0%, #702a2a 50%, #330d0d 100%)',
  AMEX: 'linear-gradient(135deg, #1a4d3a 0%, #2a705a 50%, #0d3322 100%)',
  OTHER: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #0a0a0a 100%)',
}

const NETWORK_ACCENT: Record<Network, string> = {
  VISA: '#818cf8',
  MASTERCARD: '#fb923c',
  AMEX: '#4ade80',
  OTHER: GOLD,
}

// ── Visuel carte ──────────────────────────────────────────────────────────────
export function CardVisual({ card }: { card: ParsedCard }) {
  const pan = card.numero ?? ''
  const bin = pan.slice(0, 6)
  const network = detectNetwork(bin)
  const accent = NETWORK_ACCENT[network]

  return (
    <div style={{
      width: '100%', aspectRatio: '1.586 / 1',
      borderRadius: 14, padding: '16px 18px',
      background: NETWORK_GRADIENT[network],
      border: `1px solid ${accent}33`,
      boxShadow: `0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden', color: '#fff',
    }}>
      {/* Image du BIN (en filigrane) */}
      {bin.length >= 6 && (
        <img
          src={`https://cardimages.imaginecurve.com/cards/${bin}.png`}
          alt=""
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.18, mixBlendMode: 'luminosity',
          }}
        />
      )}

      {/* Reflets décoratifs */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Top: chip + network */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 24, borderRadius: 4,
          background: 'linear-gradient(135deg, #c9a44c, #9c7e30)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        }} />
        <div style={{ ...BEBAS, fontSize: 16, letterSpacing: '0.12em', color: accent, textShadow: `0 0 8px ${accent}55` }}>
          {network === 'OTHER' ? '••••' : network}
        </div>
      </div>

      {/* PAN */}
      <div style={{
        ...MONO, fontSize: 18, color: '#fff', letterSpacing: '0.06em',
        fontWeight: 600, position: 'relative', zIndex: 1,
        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
      }}>
        {pan ? formatPan(pan) : '•••• •••• •••• ••••'}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', marginBottom: 3 }}>CARDHOLDER</div>
          <div style={{ ...MONO, fontSize: 11, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.05em' }}>
            {card.titulaire || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', marginBottom: 3 }}>EXP</div>
          <div style={{ ...MONO, fontSize: 11, color: '#fff', letterSpacing: '0.05em' }}>{card.expiration || '—'}</div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', marginBottom: 3 }}>CVV</div>
          <div style={{ ...MONO, fontSize: 11, color: '#fff', letterSpacing: '0.05em' }}>{card.cvv || '—'}</div>
        </div>
      </div>
    </div>
  )
}

// ── Liste des infos titulaire (sous la carte) ─────────────────────────────────
export function CardMetaList({ card }: { card: ParsedCard }) {
  const rows: Array<[string, string, string | undefined]> = [
    ['👤', 'Titulaire', card.titulaire],
    ['🎂', 'Date de naissance', card.ddn],
    ['🏠', 'Adresse', card.adresse],
    ['🏙️', 'Ville', card.ville],
    ['📧', 'Email', card.email],
    ['📞', 'Téléphone', card.telephone],
    ['🌐', 'IP', card.ip],
  ]
  const filled = rows.filter(([, , v]) => v && v.length > 0)
  if (filled.length === 0) return null
  return (
    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filled.map(([icon, label, val]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, ...MONO }}>
          <span style={{ width: 14, flexShrink: 0, opacity: 0.6 }}>{icon}</span>
          <span style={{ width: 70, flexShrink: 0, color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 1 }}>{label}</span>
          <span style={{ flex: 1, color: '#fff', wordBreak: 'break-word', lineHeight: 1.4 }}>{val}</span>
        </div>
      ))}
    </div>
  )
}

// ── Composant complet : visuel + récap ────────────────────────────────────────
export function CardPreview({ raw, index, total }: { raw: string; index?: number; total?: number }) {
  const card = parseCardFull(raw)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {index !== undefined && total !== undefined && total > 1 && (
        <div style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.1em', textAlign: 'center' }}>
          CARTE {index + 1} / {total}
        </div>
      )}
      <CardVisual card={card} />
      <CardMetaList card={card} />
    </div>
  )
}
