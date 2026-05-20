// Visuel "carte de crédit" + recap au format livraison Telegram.
// Reproduit exactement le format envoyé au client (lib/notify.ts) pour que
// le collaborateur voie chaque carte comme elle sera livrée.

export interface ParsedCard {
  numero?: string
  expiration?: string
  cvv?: string
  titulaire?: string
  nom?: string
  ddn?: string
  adresse?: string
  ville?: string
  email?: string
  telephone?: string
  ip?: string
}

export interface ProductMeta {
  bin?: string
  bank?: string
  network?: string
  level?: string
  type?: string
  device?: string
  source?: string
  age?: string
  cp?: string
  ddn?: string
}

type Network = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const SOURCE_LABEL: Record<string, string> = {
  AMELI: 'Ameli',
  MONDIAL_RELAY: 'Mondial Relay',
  AMAZON: 'Amazon',
  OTHER: 'Autre',
}

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
        nom: j.nom ?? j.titulaire,
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
    if (parts[3]) { result.titulaire = parts[3]; result.nom = parts[3] }
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
    if (parts[10] && !result.ip) result.ip = parts[10]
  }

  // Fallbacks regex
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

export function parseProductMeta(description: string | undefined): ProductMeta {
  if (!description) return {}
  try { return JSON.parse(description) ?? {} } catch { return {} }
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

// ── Visuel carte (carte CB animée) ────────────────────────────────────────────
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
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 32, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, #c9a44c, #9c7e30)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }} />
        <div style={{ ...BEBAS, fontSize: 16, letterSpacing: '0.12em', color: accent, textShadow: `0 0 8px ${accent}55` }}>
          {network === 'OTHER' ? '••••' : network}
        </div>
      </div>

      <div style={{ ...MONO, fontSize: 18, color: '#fff', letterSpacing: '0.06em', fontWeight: 600, position: 'relative', zIndex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        {pan ? formatPan(pan) : '•••• •••• •••• ••••'}
      </div>

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

// ── Section (style Telegram delivery) ─────────────────────────────────────────
function Section({ title, color, rows }: { title: string; color: string; rows: Array<[string, string | undefined]> }) {
  const filled = rows.filter(([, v]) => v && v.length > 0)
  if (filled.length === 0) return null
  return (
    <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
      <div style={{ ...BEBAS, fontSize: 11, letterSpacing: '0.14em', color, marginBottom: 9, paddingBottom: 7, borderBottom: `1px solid ${color}22` }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {filled.map(([label, val], i) => {
          const branch = i === filled.length - 1 ? '┗' : '┣'
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, ...MONO, lineHeight: 1.5 }}>
              <span style={{ color: `${color}88`, flexShrink: 0, paddingTop: 1 }}>{branch}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, minWidth: 110 }}>{label}</span>
              <span style={{ flex: 1, color: '#fff', wordBreak: 'break-word' }}>{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Format livraison (reproduit le message Telegram envoyé au client) ─────────
export function CardDeliveryView({ card, meta, productName }: { card: ParsedCard; meta?: ProductMeta; productName?: string }) {
  const m = meta ?? {}
  const bin6 = m.bin ? m.bin.slice(0, 6) : (card.numero ? card.numero.slice(0, 6) : '')
  const niveau = [m.network, m.level].filter(Boolean).join(' ')
  const deviceLabel = m.device === 'IPHONE' ? '🍎 iPhone' : m.device === 'ANDROID' ? '🤖 Android' : m.device === 'UNKNOWN' ? '❓ Inconnu' : undefined
  const scanUrl = bin6 ? `https://cardimages.imaginecurve.com/cards/${bin6}.png` : undefined

  return (
    <div style={{ marginTop: 12 }}>
      {productName && (
        <div style={{ ...BEBAS, fontSize: 13, color: GOLD, letterSpacing: '0.08em', marginBottom: 4 }}>
          🛍 {productName}
        </div>
      )}

      <Section title="🥽 BILLING" color="#a78bfa" rows={[
        ['👤 Nom complet', card.nom ?? card.titulaire],
        ['🎂 Date naissance', card.ddn ?? m.ddn],
        ['🏙 Ville', card.ville],
        ['🏠 Adresse', card.adresse],
        ['📧 Email', card.email],
        ['📞 Téléphone', card.telephone],
      ]} />

      <Section title="💳 CARTE" color={GOLD} rows={[
        ['🧾 Titulaire', card.titulaire],
        ['💳 Numéro', card.numero],
        ['🕑 Expiration', card.expiration],
        ['🔒 CVV', card.cvv],
      ]} />

      <Section title="🏦 INFOS CARTE" color="#22d3ee" rows={[
        ['🟪 BIN', m.bin],
        ['🏦 Banque', m.bank],
        ['🏷 Niveau', niveau || undefined],
        ['⚙ Type', m.type],
        ['💠 Scan', scanUrl],
      ]} />

      <Section title="💻 APPAREIL" color="#fb923c" rows={[
        ['🌐 IP', card.ip],
        ['🌟 Device', deviceLabel],
      ]} />

      {m.source && (
        <Section title="🎨 SYSTEM" color="#f472b6" rows={[
          ['🏷 Source', SOURCE_LABEL[m.source] ?? m.source],
        ]} />
      )}

      <div style={{ marginTop: 12, padding: '8px 10px', textAlign: 'center', fontSize: 9, fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', ...MONO, letterSpacing: '0.04em' }}>
        🔖 #FULLZ — Livré via FULLZ MARKETPLACE
      </div>
    </div>
  )
}

// ── Composant complet : visuel + format livraison ─────────────────────────────
export function CardPreview({ raw, meta, productName, index, total }: { raw: string; meta?: ProductMeta; productName?: string; index?: number; total?: number }) {
  const card = parseCardFull(raw)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {index !== undefined && total !== undefined && total > 1 && (
        <div style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 6, letterSpacing: '0.1em', textAlign: 'center' }}>
          CARTE {index + 1} / {total}
        </div>
      )}
      <CardVisual card={card} />
      <CardDeliveryView card={card} meta={meta} productName={productName} />
    </div>
  )
}
