import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'

const router = Router()

router.get('/', async (req: AuthRequest, res) => {
  const collabId = req.userId!

  const [earnings, products] = await Promise.all([
    prisma.collaboratorEarning.findMany({
      where: { collaboratorId: collabId },
      include: {
        orderItem: { include: { product: { select: { name: true, imageUrl: true } } } },
        order: { select: { createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.product.findMany({
      where: { collaboratorId: collabId, isActive: true },
      include: { _count: { select: { orderItems: true } } },
    }),
  ])

  const totalAmount = earnings.reduce((s, e) => s + e.amount, 0)
  const totalPlatformFee = earnings.reduce((s, e) => s + e.platformFee, 0)
  const totalSales = earnings.reduce((s, e) => s + e.orderItem.quantity, 0)

  // Group by month
  const byMonth: Record<string, number> = {}
  for (const e of earnings) {
    const key = e.order.createdAt.toISOString().slice(0, 7)
    byMonth[key] = (byMonth[key] ?? 0) + e.amount
  }

  res.json({
    totalAmount,
    totalPlatformFee,
    totalSales,
    productCount: products.length,
    recentEarnings: earnings.slice(0, 20),
    byMonth,
    topProducts: products
      .sort((a, b) => b._count.orderItems - a._count.orderItems)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, salesCount: p._count.orderItems })),
  })
})

export default router
