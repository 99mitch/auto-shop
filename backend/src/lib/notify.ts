import { bot } from '../bot'

const STATUS_MESSAGES: Record<string, (orderId: number, total?: number) => string> = {
  CONFIRMED: (id, total) => `✅ Commande #${id} confirmée ! Total: €${total?.toFixed(2) ?? '?'}`,
  PREPARING: (id) => `👨‍🍳 Votre commande #${id} est en préparation`,
  DELIVERING: (id) => `🚚 Votre commande #${id} est en livraison !`,
  DELIVERED: (id) => `✅ Commande #${id} livrée ! Merci pour votre confiance 🌸`,
  CANCELLED: (id) => `❌ Commande #${id} annulée`,
}

export async function deliverCards(
  telegramId: string,
  orderId: number,
  cards: Array<{ productName: string; data: string }>
): Promise<void> {
  if (cards.length === 0) return
  const lines = cards.map((c, i) =>
    `<b>${i + 1}. ${c.productName}</b>\n<code>${c.data}</code>`
  ).join('\n\n')
  const message = `✅ <b>Commande #${orderId} — Livraison</b>\n\n${lines}`
  try {
    await bot.api.sendMessage(telegramId, message, { parse_mode: 'HTML' })
  } catch (err) {
    console.warn(`[deliver] Failed to send cards to ${telegramId}:`, err)
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
