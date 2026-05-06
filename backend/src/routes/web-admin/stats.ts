import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

function periodStart(period: string): Date {
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // day (default)
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

router.get('/', async (req, res) => {
  const period = (['day', 'week', 'month'] as const).includes(req.query.period as any)
    ? (req.query.period as 'day' | 'week' | 'month')
    : 'day'

  const since = periodStart(period)
  const activeWhere = { NOT: { status: 'CANCELLED' } } as const
  const periodWhere = { createdAt: { gte: since }, NOT: { status: 'CANCELLED' } } as const

  const [
    totalRevenue, totalOrders, totalUsers,
    periodRevenue, periodOrders, periodCardsSold,
    activeCards, totalDeposits, periodDeposits,
  ] = await Promise.all([
    prisma.order.aggregate({ where: activeWhere, _sum: { total: true } }),
    prisma.order.count({ where: activeWhere }),
    prisma.user.count(),
    prisma.order.aggregate({ where: periodWhere, _sum: { total: true } }),
    prisma.order.count({ where: periodWhere }),
    prisma.orderItem.aggregate({
      where: { order: { createdAt: { gte: since }, NOT: { status: 'CANCELLED' } } },
      _sum: { quantity: true },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.balanceTopUp.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.balanceTopUp.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true } }),
  ])

  res.json({
    period,
    allTime: {
      revenue: totalRevenue._sum.total ?? 0,
      orders: totalOrders,
      users: totalUsers,
      deposits: totalDeposits._sum.amount ?? 0,
    },
    currentPeriod: {
      revenue: periodRevenue._sum.total ?? 0,
      orders: periodOrders,
      cardsSold: periodCardsSold._sum.quantity ?? 0,
      deposits: periodDeposits._sum.amount ?? 0,
    },
    activeCards,
  })
})

export default router
