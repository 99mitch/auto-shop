import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

router.get('/', async (_req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [ordersToday, revenueResult, lowStockProducts] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: today }, NOT: { status: 'CANCELLED' } },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today }, NOT: { status: 'CANCELLED' } },
      _sum: { total: true },
    }),
    prisma.product.findMany({
      where: { stock: { lte: 3 }, isActive: true },
      include: { category: true },
      orderBy: { stock: 'asc' },
    }),
  ])

  res.json({
    ordersToday,
    revenueToday: revenueResult._sum.total ?? 0,
    lowStockProducts: lowStockProducts.map((p) => ({ ...p, images: JSON.parse(p.images) })),
  })
})

export default router
