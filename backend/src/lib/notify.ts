import { bot } from '../../../bot/src/index'

const STATUS_MESSAGES: Record<string, (orderId: number, total?: number) => string> = {
  CONFIRMED: (id, total) => `✅ Commande #${id} confirmée ! Total: €${total?.toFixed(2) ?? '?'}`,
  PREPARING: (id) => `👨‍🍳 Votre commande #${id} est en préparation`,
  DELIVERING: (id) => `🚚 Votre commande #${id} est en livraison !`,
  DELIVERED: (id) => `✅ Commande #${id} livrée ! Merci pour votre confiance 🌸`,
  CANCELLED: (id) => `❌ Commande #${id} annulée`,
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
