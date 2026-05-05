import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../prisma'
import { notify } from '../lib/notify'
import { fulfillCCOrder, fulfillDataOrder } from '../lib/fulfillment'
import { getAdminIds } from '../middleware/admin'

const router = Router()

function verifySignature(body: object, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET || ''
  if (!secret) return true
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

async function notifyAdminsPreOrder(preOrderId: number): Promise<void> {
  const preOrder = await prisma.preOrder.findUnique({ where: { id: preOrderId }, include: { user: true } })
  if (!preOrder) return

  const adminIds = getAdminIds()
  const msg =
    `🆕 Nouvelle précommande CC #${preOrderId}\n` +
    `👤 ${preOrder.user.firstName} (@${preOrder.user.username ?? '—'})\n` +
    `💳 Qty: ${preOrder.quantity} × €${preOrder.pricePerCard} = €${preOrder.total}\n` +
    `💰 Paiement: ${preOrder.paymentMethod}\n` +
    (preOrder.bank ? `🏦 Banque: ${preOrder.bank}\n` : '') +
    (preOrder.network ? `🔗 Réseau: ${preOrder.network}\n` : '') +
    (preOrder.level ? `⭐ Level: ${preOrder.level}\n` : '') +
    (preOrder.cardType ? `🃏 Type: ${preOrder.cardType}\n` : '') +
    (preOrder.department ? `📍 Dept: ${preOrder.department}\n` : '') +
    (preOrder.ageRange ? `👤 Âge: ${preOrder.ageRange}\n` : '') +
    (preOrder.bin ? `🔢 BIN: ${preOrder.bin}\n` : '') +
    `\nRépondre dans le panel admin /admin`

  for (const adminTelegramId of adminIds) {
    await notify(adminTelegramId, msg).catch(() => {})
  }
}

router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['x-webhook-signature'] as string
  if (signature && !verifySignature(req.body, signature)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const { event, paymentId, amount, metadata } = req.body

  if (event !== 'payment.confirmed') {
    res.json({ ok: true })
    return
  }

  const { type, refId, userId } = metadata ?? {}

  try {
    if (type === 'topup' && userId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { balance: { increment: amount } } }),
        prisma.balanceTopUp.updateMany({ where: { paymentId }, data: { status: 'CONFIRMED' } }),
      ])
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.telegramId) {
        await notify(user.telegramId, `✅ Solde crédité de €${Number(amount).toFixed(2)} USDT`)
      }
    } else if (type === 'order' && refId) {
      await fulfillCCOrder(refId)
    } else if (type === 'data-order' && refId) {
      await fulfillDataOrder(refId)
    } else if (type === 'preorder' && refId) {
      await prisma.preOrder.update({ where: { id: refId }, data: { cryptoPaid: true } })
      await notifyAdminsPreOrder(refId)
    }
  } catch (err) {
    console.error('[webhook] Error processing event:', err)
  }

  res.json({ ok: true })
})

export default router
