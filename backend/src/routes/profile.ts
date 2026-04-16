import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { CreateAddressSchema, UpdateAddressSchema } from 'floramini-types'

const router = Router()

router.use(authMiddleware)

// ─── Addresses ───────────────────────────────────────────────────────────────

router.get('/addresses', async (req: AuthRequest, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.userId! },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  })
  res.json(addresses)
})

router.post('/addresses', async (req: AuthRequest, res) => {
  const parsed = CreateAddressSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.userId! },
      data: { isDefault: false },
    })
  }

  const address = await prisma.address.create({
    data: { ...parsed.data, userId: req.userId! },
  })
  res.status(201).json(address)
})

router.put('/addresses/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  const existing = await prisma.address.findFirst({ where: { id, userId: req.userId! } })
  if (!existing) {
    res.status(404).json({ error: 'Address not found' })
    return
  }

  const parsed = UpdateAddressSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.userId!, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const address = await prisma.address.update({ where: { id }, data: parsed.data })
  res.json(address)
})

router.delete('/addresses/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  const existing = await prisma.address.findFirst({ where: { id, userId: req.userId! } })
  if (!existing) {
    res.status(404).json({ error: 'Address not found' })
    return
  }
  await prisma.address.delete({ where: { id } })
  res.status(204).end()
})

// ─── Favorites ───────────────────────────────────────────────────────────────

router.get('/favorites', async (req: AuthRequest, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.userId! },
    include: { product: { include: { category: true } } },
  })
  res.json(
    favorites.map((f) => ({
      ...f,
      product: f.product ? { ...f.product, images: JSON.parse(f.product.images) } : null,
    }))
  )
})

router.post('/favorites/:productId', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.productId)
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return
  }

  const favorite = await prisma.favorite.upsert({
    where: { userId_productId: { userId: req.userId!, productId } },
    update: {},
    create: { userId: req.userId!, productId },
  })
  res.status(201).json(favorite)
})

router.delete('/favorites/:productId', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.productId)
  await prisma.favorite.deleteMany({ where: { userId: req.userId!, productId } })
  res.status(204).end()
})

export default router
