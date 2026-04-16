import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'
import { UpdateOrderStatusSchema } from 'floramini-types'
import { notifyOrderStatus } from '../../lib/notify'

const router = Router()

function parseOrder(order: any) {
  return {
    ...order,
    items: order.items?.map((i: any) => ({ ...i, options: JSON.parse(i.options) })),
  }
}

router.get('/', async (req: AuthRequest, res) => {
  const { status, sort = 'desc' } = req.query

  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : undefined,
    include: { user: true, items: { include: { product: true } }, address: true },
    orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
  })

  res.json(orders.map(parseOrder))
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order id' })
    return
  }

  const parsed = UpdateOrderStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { items: { include: { product: true } }, address: true, user: true },
  })

  notifyOrderStatus(order.user.telegramId, order.id, parsed.data.status, order.total)

  res.json(parseOrder(updated))
})

export default router
