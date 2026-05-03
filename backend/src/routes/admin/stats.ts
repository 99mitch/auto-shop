import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

router.get('/', async (_req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [ordersToday, revenueResult, totalOrders, totalRevenue, collabFees, productCount] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: today }, NOT: { status: 'CANCELLED' } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: today }, NOT: { status: 'CANCELLED' } }, _sum: { total: true } }),
    prisma.order.count({ where: { NOT: { status: 'CANCELLED' } } }),
    prisma.order.aggregate({ where: { NOT: { status: 'CANCELLED' } }, _sum: { total: true } }),
    prisma.collaboratorEarning.aggregate({ _sum: { platformFee: true } }),
    prisma.product.count({ where: { isActive: true } }),
  ])

  res.json({
    ordersToday,
    revenueToday: revenueResult._sum.total ?? 0,
    totalOrders,
    totalRevenue: totalRevenue._sum.total ?? 0,
    totalPlatformFees: collabFees._sum.platformFee ?? 0,
    productCount,
    lowStockProducts: [],
  })
})

export default router
