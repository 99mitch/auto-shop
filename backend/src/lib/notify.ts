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
    device?: string
    ddn?: string
    age?: string
    cp?: string
  }
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatCardBlock(c: CardDelivery, idx: number): string {
  const m = c.meta ?? {}
  const lines: string[] = []

  lines.push(`<b>${idx + 1}. ${escHtml(c.productName)}</b>`)

  const metaLine: string[] = []
  if (m.device === 'IPHONE') metaLine.push('🍎 iPhone')
  else if (m.device === 'ANDROID') metaLine.push('🤖 Android')
  if (m.ddn) metaLine.push(`🎂 ${m.ddn}`)
  if (m.age) metaLine.push(`${m.age} ans`)
  if (m.cp) metaLine.push(`📍 ${m.cp}`)
  if (metaLine.length) lines.push(metaLine.join('  ·  '))

  lines.push('')

  // Format raw data: if key: value lines → bold keys, else raw code block
  const dataLines = c.data.split('\n')
  const isKeyValue = dataLines.every(l => l.includes(':'))
  if (isKeyValue) {
    for (const l of dataLines) {
      const sep = l.indexOf(':')
      if (sep === -1) { lines.push(`<code>${escHtml(l)}</code>`); continue }
      const key = escHtml(l.slice(0, sep).trim())
      const val = escHtml(l.slice(sep + 1).trim())
      lines.push(`<b>${key}</b> : <code>${val}</code>`)
    }
  } else {
    lines.push(`<code>${escHtml(c.data)}</code>`)
  }

  if (m.bin && m.bin.length >= 6) {
    const curvUrl = `https://cardimages.imaginecurve.com/cards/${m.bin.slice(0, 6)}.png`
    lines.push('')
    lines.push(`🖼 <a href="${curvUrl}">Voir la carte →</a>`)
  }

  return lines.join('\n')
}

export async function deliverCards(
  telegramId: string,
  orderId: number,
  cards: CardDelivery[]
): Promise<void> {
  if (cards.length === 0) return
  const sep = '\n\n──────────────────────\n\n'
  const body = cards.map((c, i) => formatCardBlock(c, i)).join(sep)
  const message = `🃏 <b>Commande #${orderId} — Livraison</b>\n\n${body}`
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
