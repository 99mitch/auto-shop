import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { CreateOrderSchema } from 'floramini-types'
import { fulfillCCOrder } from '../lib/fulfillment'
import { createCryptoPayment } from '../lib/cryptoApi'

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
    // Each CC is unique — quantity capped at 1
    if (item.quantity > 1) {
      res.status(400).json({ error: `One unit per card — "${product.name}"` })
      return
    }
    if (product.stock < 1) {
      res.status(400).json({ error: `Out of stock — "${product.name}"` })
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
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order id' })
    return
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: req.userId!, status: 'PENDING' },
    include: { user: true },
  })
  if (!order) {
    res.status(404).json({ error: 'Order not found or already processed' })
    return
  }

  const paymentMethod = req.body?.paymentMethod
  if (paymentMethod !== 'BALANCE' && paymentMethod !== 'CRYPTO') {
    res.status(400).json({ error: 'paymentMethod must be BALANCE or CRYPTO' })
    return
  }

  const rawCurrency = req.body?.cryptoCurrency as string | undefined
  const cryptoCurrency = (['USDT', 'ETH', 'SOL'] as const).includes(rawCurrency as any)
    ? (rawCurrency as 'USDT' | 'ETH' | 'SOL')
    : 'USDT'

  try {
    if (paymentMethod === 'BALANCE') {
      if (order.user.balance < order.total) {
        res.status(400).json({ error: 'Solde insuffisant' })
        return
      }
      await prisma.$transaction([
        prisma.user.update({ where: { id: req.userId! }, data: { balance: { decrement: order.total } } }),
        prisma.order.update({ where: { id }, data: { paymentMethod: 'BALANCE' } }),
      ])
      await fulfillCCOrder(id)
      const updated = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, address: true },
      })
      res.json({ ...updated, items: updated!.items.map((i: any) => ({ ...i, options: JSON.parse(i.options) })) })
      return
    }

    // CRYPTO
    const payment = await createCryptoPayment(order.total, `Commande #${id}`, {
      type: 'order',
      refId: id,
      userId: req.userId!,
    }, cryptoCurrency)
    await prisma.order.update({ where: { id }, data: { paymentMethod: 'CRYPTO', cryptoPaymentId: payment.paymentId } })
    res.json({ cryptoPayment: payment })
  } catch (err) {
    console.error('[orders] pay error:', err)
    res.status(500).json({ error: 'Erreur traitement paiement' })
  }
})

export default router
