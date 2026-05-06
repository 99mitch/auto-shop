import { Router } from 'express'
import { prisma } from '../../prisma'
import { CreateProductSchema, UpdateProductSchema } from 'floramini-types'
import { matchAndDeliver } from '../../lib/preorderMatcher'

const router = Router()

function parseProduct(p: any) {
  return { ...p, images: JSON.parse(p.images) }
}

router.get('/', async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { id: 'asc' },
  })
  res.json(products.map(parseProduct))
})

router.post('/', async (req, res) => {
  const parsed = CreateProductSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { images, ...rest } = parsed.data
  const product = await prisma.product.create({
    data: { ...rest, images: JSON.stringify(images) },
    include: { category: true },
  })
  res.status(201).json(parseProduct(product))
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product id' })
    return
  }

  const parsed = UpdateProductSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { images, ...rest } = parsed.data
  const product = await prisma.product.update({
    where: { id },
    data: { ...rest, ...(images !== undefined ? { images: JSON.stringify(images) } : {}) },
    include: { category: true },
  })
  res.json(parseProduct(product))
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product id' })
    return
  }
  await prisma.product.update({ where: { id }, data: { isActive: false } })
  res.status(204).end()
})

// GET /:id/inventory — inventory stats
router.get('/:id/inventory', async (req, res) => {
  const productId = parseInt(req.params.id)
  const [total, unsold] = await Promise.all([
    prisma.cardInventory.count({ where: { productId } }),
    prisma.cardInventory.count({ where: { productId, sold: false } }),
  ])
  res.json({ total, unsold, sold: total - unsold })
})

// POST /:id/inventory/bulk — bulk upload CC lines
router.post('/:id/inventory/bulk', async (req, res) => {
  const productId = parseInt(req.params.id)
  const { lines } = req.body as { lines: string[] }
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: 'lines array required' })
    return
  }
  // Validate: each line must start with 13-19 digits
  const valid = lines.filter(l => /^\d{13,19}/.test(l.trim())).map(l => l.trim())
  if (valid.length === 0) {
    res.status(400).json({ error: 'No valid CC lines found' })
    return
  }
  await prisma.cardInventory.createMany({
    data: valid.map(fullData => ({ productId, fullData })),
  })
  // Sync stock to unsold count
  const unsold = await prisma.cardInventory.count({ where: { productId, sold: false } })
  await prisma.product.update({ where: { id: productId }, data: { stock: unsold } })
  matchAndDeliver(productId).catch((err) => console.warn('[matcher] Error:', err))
  res.json({ added: valid.length, stock: unsold })
})

// DELETE /:id/inventory — delete all unsold inventory for product
router.delete('/:id/inventory', async (req, res) => {
  const productId = parseInt(req.params.id)
  const { count } = await prisma.cardInventory.deleteMany({ where: { productId, sold: false } })
  await prisma.product.update({ where: { id: productId }, data: { stock: 0 } })
  res.json({ deleted: count })
})

export default router
