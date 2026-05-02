import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'

const router = Router()

router.get('/', async (_req, res) => {
  const collabs = await prisma.user.findMany({
    where: { role: 'COLLABORATOR' },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      photoUrl: true,
      createdAt: true,
      _count: { select: { products: true } },
      earnings: {
        select: { amount: true, platformFee: true },
      },
    },
  })

  const result = collabs.map((c) => ({
    id: c.id,
    telegramId: c.telegramId,
    firstName: c.firstName,
    lastName: c.lastName,
    username: c.username,
    photoUrl: c.photoUrl,
    createdAt: c.createdAt,
    productCount: c._count.products,
    totalEarnings: c.earnings.reduce((s, e) => s + e.amount, 0),
    totalPlatformFee: c.earnings.reduce((s, e) => s + e.platformFee, 0),
  }))

  res.json(result)
})

router.post('/', async (req: AuthRequest, res) => {
  const { telegramId } = req.body as { telegramId: string }
  if (!telegramId?.trim()) {
    res.status(400).json({ error: 'telegramId required' })
    return
  }

  const target = await prisma.user.findUnique({ where: { telegramId: telegramId.trim() } })
  if (!target) {
    res.status(404).json({ error: 'User not found — they must have opened the app at least once' })
    return
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: 'COLLABORATOR' },
  })

  res.json({ ok: true, user: updated })
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  await prisma.user.update({ where: { id }, data: { role: 'CUSTOMER' } })
  res.json({ ok: true })
})

router.get('/:id/stats', async (req, res) => {
  const id = parseInt(req.params.id)

  const [products, earnings] = await Promise.all([
    prisma.product.findMany({
      where: { collaboratorId: id, isActive: true },
      include: {
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.collaboratorEarning.findMany({
      where: { collaboratorId: id },
      include: { orderItem: { select: { quantity: true, unitPrice: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json({
    products: products.map((p) => ({ ...p, salesCount: p._count.orderItems })),
    earnings,
    totalAmount: earnings.reduce((s, e) => s + e.amount, 0),
    totalPlatformFee: earnings.reduce((s, e) => s + e.platformFee, 0),
  })
})

export default router
