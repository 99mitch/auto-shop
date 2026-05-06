// backend/src/routes/preorders.ts
import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { CreatePreOrderSchema } from 'floramini-types'
import { createCryptoPayment } from '../lib/cryptoApi'
import { getAdminIds } from '../middleware/admin'
import { notify } from '../lib/notify'

const router = Router()
router.use(authMiddleware)

async function notifyAdminsPreOrder(preOrderId: number): Promise<void> {
  const preOrder = await prisma.preOrder.findUnique({ where: { id: preOrderId }, include: { user: true } })
  if (!preOrder) return

  const adminIds = getAdminIds()
  const msg =
    `🆕 Précommande CC #${preOrderId} — VALIDATION REQUISE\n` +
    `👤 ${preOrder.user.firstName} (@${preOrder.user.username ?? '—'})\n` +
    `💳 ${preOrder.quantity} carte(s) × €${preOrder.pricePerCard} = €${preOrder.total}\n` +
    `💰 ${preOrder.paymentMethod === 'BALANCE' ? '✅ Solde réservé' : '✅ Crypto payé'}\n` +
    (preOrder.bank ? `🏦 Banque: ${preOrder.bank}\n` : '') +
    (preOrder.network ? `🔗 ${preOrder.network}\n` : '') +
    (preOrder.level ? `⭐ ${preOrder.level}\n` : '') +
    (preOrder.cardType ? `🃏 ${preOrder.cardType}\n` : '') +
    (preOrder.department ? `📍 Dept ${preOrder.department}\n` : '') +
    (preOrder.ageRange ? `👤 ${preOrder.ageRange} ans\n` : '') +
    (preOrder.bin ? `🔢 BIN ${preOrder.bin}\n` : '') +
    `\n→ Panel admin pour approuver/rejeter`

  for (const adminTelegramId of adminIds) {
    await notify(adminTelegramId, msg).catch(() => {})
  }
}

// POST /api/preorders — créer une précommande
router.post('/', async (req: AuthRequest, res) => {
  const parsed = CreatePreOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { paymentMethod, quantity, pricePerCard, ...filters } = parsed.data
  const total = quantity * pricePerCard

  if (paymentMethod === 'BALANCE') {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user || user.balance < total) {
      res.status(400).json({ error: `Solde insuffisant (€${user?.balance.toFixed(2) ?? 0} dispo, €${total.toFixed(2)} requis)` })
      return
    }

    const preorder = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.userId! }, data: { balance: { decrement: total } } })
      return tx.preOrder.create({ data: { userId: req.userId!, paymentMethod, quantity, pricePerCard, total, ...filters } })
    })

    await notifyAdminsPreOrder(preorder.id)
    res.status(201).json(preorder)
    return
  }

  // CRYPTO — créer le paiement d'abord
  try {
    const preorder = await prisma.preOrder.create({
      data: { userId: req.userId!, paymentMethod, quantity, pricePerCard, total, ...filters },
    })
    const payment = await createCryptoPayment(total, `Précommande CC #${preorder.id}`, {
      type: 'preorder',
      refId: preorder.id,
      userId: req.userId!,
    })
    await prisma.preOrder.update({ where: { id: preorder.id }, data: { cryptoPaymentId: payment.paymentId } })
    res.status(201).json({ preorder, cryptoPayment: payment })
  } catch (err) {
    console.error('[preorders] crypto payment error:', err)
    res.status(500).json({ error: 'Erreur création paiement crypto' })
  }
})

// GET /api/preorders — liste des précommandes de l'utilisateur
router.get('/', async (req: AuthRequest, res) => {
  try {
    const preorders = await prisma.preOrder.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })
    res.json(preorders)
  } catch (err) {
    console.error('[preorders] GET / error:', err)
    res.status(500).json({ error: 'Erreur récupération précommandes' })
  }
})

// DELETE /api/preorders/:id — annuler si PENDING
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const preorder = await prisma.preOrder.findFirst({ where: { id, userId: req.userId! } })
  if (!preorder) { res.status(404).json({ error: 'Not found' }); return }
  if (preorder.status !== 'PENDING') {
    res.status(400).json({ error: 'Seules les précommandes PENDING peuvent être annulées' })
    return
  }

  await prisma.preOrder.update({ where: { id }, data: { status: 'REJECTED' } })

  if (preorder.paymentMethod === 'BALANCE') {
    await prisma.user.update({ where: { id: req.userId! }, data: { balance: { increment: preorder.total } } })
  }

  res.json({ ok: true })
})

export default router
