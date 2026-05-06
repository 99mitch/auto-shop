import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

// List all users with balance, order count, total spent
router.get('/', async (req, res) => {
  const search = (req.query.search as string) ?? ''
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = 50
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { username: { contains: search } },
          { telegramId: { contains: search } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          where: { NOT: { status: 'CANCELLED' } },
          select: { total: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const result = users.map((u: typeof users[0]) => ({
    id: u.id,
    telegramId: u.telegramId,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    role: u.role,
    balance: u.balance,
    createdAt: u.createdAt,
    orderCount: u._count.orders,
    totalSpent: u.orders.reduce((s: number, o: typeof u.orders[0]) => s + o.total, 0),
  }))

  res.json({ users: result, total, page, pages: Math.ceil(total / limit) })
})

// Update user balance or role
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { balance, role } = req.body as { balance?: number; role?: string }

  const data: Record<string, unknown> = {}
  if (typeof balance === 'number') data.balance = Math.max(0, balance)
  if (role && ['CUSTOMER', 'COLLABORATOR', 'ADMIN'].includes(role)) data.role = role

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Nothing to update' })
    return
  }

  const user = await prisma.user.update({ where: { id }, data, select: { id: true, balance: true, role: true } })
  res.json(user)
})

export default router
