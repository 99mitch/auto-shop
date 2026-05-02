import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { CreateOrderSchema } from 'floramini-types'
import { notifyOrderStatus } from '../lib/notify'

const router = Router()

router.use(authMiddleware)

function parseOrder(order: any) {
  return {
    ...order,
    items: order.items?.map((i: any) => ({ ...i, options: JSON.parse(i.options) })),
  }
}

router.post('/', async (req: AuthRequest, res) => {
  const parsed = CreateOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { addressId, newAddress, deliverySlot, note, items } = parsed.data

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, isActive: true },
  })

  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    res.status(400).json({ error: 'One or more products not found or unavailable' })
    return
  }

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId)!
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for "${product.name}"` })
      return
    }
  }

  const deliveryFeeSetting = await prisma.setting.findUnique({ where: { key: 'deliveryFee' } })
  const deliveryFee = deliveryFeeSetting ? parseFloat(deliveryFeeSetting.value) : 5.0

  const subtotal = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!
    return sum + product.price * item.quantity
  }, 0)

  const total = subtotal + deliveryFee

  let resolvedAddressId = addressId ?? null
  if (newAddress && !addressId) {
    const addr = await prisma.address.create({
      data: { ...newAddress, userId: req.userId! },
    })
    resolvedAddressId = addr.id
  }

  const order = await prisma.order.create({
    data: {
      userId: req.userId!,
      addressId: resolvedAddressId,
      deliverySlot,
      note: note ?? null,
      subtotal,
      deliveryFee,
      total,
      items: {
        create: items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.price,
            options: JSON.stringify(item.options ?? {}),
          }
        }),
      },
    },
    include: { items: { include: { product: true } }, address: true },
  })

  await Promise.all(
    items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    )
  )

  res.status(201).json(parseOrder(order))
})

router.get('/', async (req: AuthRequest, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.userId! },
    include: { items: { include: { product: true } }, address: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(orders.map(parseOrder))
})

router.get('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order id' })
    return
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: req.userId! },
    include: { items: { include: { product: true } }, address: true },
  })

  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  res.json(parseOrder(order))
})

router.post('/:id/pay', async (req: AuthRequest, res) => {
  // TODO: integrate crypto payment API
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order id' })
    return
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: req.userId!, status: 'PENDING' },
    include: { items: { include: { product: { select: { collaboratorId: true } } } } },
  })

  if (!order) {
    res.status(404).json({ error: 'Order not found or already processed' })
    return
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CONFIRMED' },
    include: { items: { include: { product: true } }, address: true },
  })

  // Dispatch collaborator commissions (20% platform, 80% collab)
  const earningsToCreate = order.items
    .filter((item) => item.product.collaboratorId !== null)
    .map((item) => {
      const gross = item.unitPrice * item.quantity
      return {
        orderId: order.id,
        orderItemId: item.id,
        collaboratorId: item.product.collaboratorId!,
        amount: parseFloat((gross * 0.8).toFixed(2)),
        platformFee: parseFloat((gross * 0.2).toFixed(2)),
      }
    })

  if (earningsToCreate.length > 0) {
    await prisma.collaboratorEarning.createMany({ data: earningsToCreate })
  }

  notifyOrderStatus(req.telegramId!, order.id, 'CONFIRMED', order.total)

  res.json(parseOrder(updated))
})

export default router
