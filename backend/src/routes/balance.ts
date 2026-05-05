import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { createCryptoPayment, getCryptoPaymentStatus } from '../lib/cryptoApi'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { balanceTopUps: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  res.json({ balance: user?.balance ?? 0, topUps: user?.balanceTopUps ?? [] })
})

router.post('/topup', async (req: AuthRequest, res) => {
  const amount = parseFloat(req.body.amount)
  if (!amount || amount < 1) {
    res.status(400).json({ error: 'Montant minimum : 1 USDT' })
    return
  }

  try {
    const payment = await createCryptoPayment(amount, `Recharge solde utilisateur #${req.userId}`, {
      type: 'topup',
      userId: req.userId!,
    })

    const topUp = await prisma.balanceTopUp.create({
      data: { userId: req.userId!, paymentId: payment.paymentId, amount, status: 'PENDING' },
    })

    res.json({ topUp, payment })
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur création paiement crypto' })
  }
})

router.get('/topup/:paymentId/status', async (req: AuthRequest, res) => {
  const { paymentId } = req.params
  const topUp = await prisma.balanceTopUp.findFirst({ where: { paymentId, userId: req.userId! } })
  if (!topUp) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const status = await getCryptoPaymentStatus(paymentId)
    res.json({ ...status, localStatus: topUp.status })
  } catch {
    res.status(500).json({ error: 'Erreur récupération statut' })
  }
})

export default router
