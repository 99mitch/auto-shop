// backend/src/routes/admin/preorders.ts
import { Router } from 'express'
import { prisma } from '../../prisma'
import { notify } from '../../lib/notify'

const router = Router()

// GET /api/admin/preorders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const preorders = await prisma.preOrder.findMany({
      where: status ? { status: status as string } : undefined,
      include: { user: { select: { id: true, firstName: true, username: true, telegramId: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(preorders)
  } catch (err) {
    console.error('[admin/preorders] GET / error:', err)
    res.status(500).json({ error: 'Erreur récupération précommandes' })
  }
})

// PATCH /api/admin/preorders/:id — approuver ou rejeter
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const { action } = req.body as { action: 'APPROVE' | 'REJECT' }
  if (!['APPROVE', 'REJECT'].includes(action)) {
    res.status(400).json({ error: 'action doit être APPROVE ou REJECT' })
    return
  }

  const preorder = await prisma.preOrder.findUnique({ where: { id }, include: { user: true } })
  if (!preorder) { res.status(404).json({ error: 'Not found' }); return }
  if (!['PENDING'].includes(preorder.status)) {
    res.status(400).json({ error: 'Seules les précommandes PENDING peuvent être traitées' })
    return
  }

  if (action === 'APPROVE') {
    const updated = await prisma.preOrder.update({ where: { id }, data: { status: 'APPROVED' } })
    if (preorder.user.telegramId) {
      await notify(
        preorder.user.telegramId,
        `✅ Précommande #${id} approuvée !\nTu recevras les cartes automatiquement dès qu'elles correspondent à tes filtres.`,
      ).catch(() => {})
    }
    res.json(updated)
  } else {
    // REJECT — rembourser le solde si BALANCE
    const updated = await prisma.preOrder.update({ where: { id }, data: { status: 'REJECTED' } })
    if (preorder.paymentMethod === 'BALANCE') {
      await prisma.user.update({ where: { id: preorder.userId }, data: { balance: { increment: preorder.total } } })
    }
    if (preorder.user.telegramId) {
      const msg = preorder.paymentMethod === 'BALANCE'
        ? `❌ Précommande #${id} refusée. €${preorder.total.toFixed(2)} remboursés sur ton solde.`
        : `❌ Précommande #${id} refusée. Contacte le support pour le remboursement crypto.`
      await notify(preorder.user.telegramId, msg).catch(() => {})
    }
    res.json(updated)
  }
})

export default router
