// BIN → (banque, niveau, type, network).
// Source minimale : ajouter ici les BINs vus en pratique. La détection du
// réseau (network) est dérivée du premier chiffre du BIN.

export type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER'
export type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BUSINESS' | 'SIGNATURE' | 'INFINITE' | 'WORLD' | 'WORLD_ELITE' | 'BLACK' | 'STANDARD' | string
export type CardType = 'CREDIT' | 'DEBIT' | 'PREPAID' | 'CHARGE' | string

interface BinEntry {
  bank: string
  level?: CardLevel
  type?: CardType
}

// Table de BINs connus. Étendre au fur et à mesure des cartes reçues.
const BIN_TABLE: Record<string, BinEntry> = {
  '412521': { bank: 'BPCE', level: 'PLATINUM', type: 'CREDIT' },
}

export function detectNetwork(bin: string): CardNetwork {
  const b = bin.replace(/\D/g, '')
  if (!b) return 'OTHER'
  const c0 = b[0]
  const c2 = b.slice(0, 2)
  const c4 = b.slice(0, 4)
  if (c0 === '4') return 'VISA'
  if (c0 === '5' && c2 >= '51' && c2 <= '55') return 'MASTERCARD'
  if (c4 >= '2221' && c4 <= '2720') return 'MASTERCARD'
  if (c2 === '34' || c2 === '37') return 'AMEX'
  if (c0 === '6') return 'DISCOVER'
  return 'OTHER'
}

export interface BinInfo {
  bin: string
  network: CardNetwork
  bank?: string
  level?: CardLevel
  type?: CardType
  scanUrl: string
}

export function lookupBin(rawPan: string): BinInfo | null {
  const pan = (rawPan || '').replace(/\D/g, '')
  if (pan.length < 6) return null
  const bin = pan.slice(0, 6)
  const entry = BIN_TABLE[bin]
  return {
    bin,
    network: detectNetwork(bin),
    bank: entry?.bank,
    level: entry?.level,
    type: entry?.type,
    scanUrl: `cardimages.imaginecurve.com/cards/${bin}.png`,
  }
}
