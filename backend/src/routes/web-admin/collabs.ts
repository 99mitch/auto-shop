import { Router } from 'express'
import { prisma } from '../../prisma'

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
      createdAt: true,
      _count: { select: { products: true } },
      earnings: { select: { amount: true, platformFee: true, createdAt: true } },
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          _count: { select: { orderItems: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json(
    collabs.map((c) => ({
      id: c.id,
      telegramId: c.telegramId,
      firstName: c.firstName,
      lastName: c.lastName,
      username: c.username,
      createdAt: c.createdAt,
      cardCount: c._count.products,
      cardsSold: c.products.reduce((s, p) => s + p._count.orderItems, 0),
      totalEarnings: c.earnings.reduce((s, e) => s + e.amount, 0),
      totalPlatformFee: c.earnings.reduce((s, e) => s + e.platformFee, 0),
      products: c.products.map((p) => ({ ...p, salesCount: p._count.orderItems })),
    }))
  )
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const collab = await prisma.user.findFirst({
    where: { id, role: 'COLLABORATOR' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      telegramId: true,
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          isActive: true,
          _count: { select: { orderItems: true } },
        },
        orderBy: { id: 'desc' },
      },
      earnings: {
        select: { amount: true, platformFee: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!collab) {
    res.status(404).json({ error: 'Collaborateur introuvable' })
    return
  }

  res.json({
    ...collab,
    products: collab.products.map((p) => ({ ...p, salesCount: p._count.orderItems })),
    totalEarnings: collab.earnings.reduce((s, e) => s + e.amount, 0),
    totalPlatformFee: collab.earnings.reduce((s, e) => s + e.platformFee, 0),
  })
})

export default router
