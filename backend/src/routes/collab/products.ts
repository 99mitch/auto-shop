import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'

const router = Router()

function parseImages(raw: string): string[] {
  try { return JSON.parse(raw) } catch { return [] }
}

router.get('/', async (req: AuthRequest, res) => {
  const products = await prisma.product.findMany({
    where: { collaboratorId: req.userId!, isActive: true },
    include: { category: true },
    orderBy: { id: 'desc' },
  })
  res.json(products.map((p) => ({ ...p, images: parseImages(p.images) })))
})

router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, name, description, price, stock, imageUrl, images } = req.body

  if (!name || price == null) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const product = await prisma.product.create({
    data: {
      categoryId: categoryId ? parseInt(categoryId) : null,
      name,
      description: description ?? '',
      price: parseFloat(price),
      stock: parseInt(stock ?? 0),
      imageUrl: imageUrl ?? '',
      images: JSON.stringify(images ?? []),
      collaboratorId: req.userId!,
    },
  })

  res.json({ ...product, images: parseImages(product.images) })
})

router.put('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)

  const existing = await prisma.product.findFirst({ where: { id, collaboratorId: req.userId! } })
  if (!existing) {
    res.status(404).json({ error: 'Not found or not yours' })
    return
  }

  const { name, description, price, stock, imageUrl, images } = req.body

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(images !== undefined && { images: JSON.stringify(images) }),
    },
  })

  res.json({ ...updated, images: parseImages(updated.images) })
})

router.delete('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)

  const existing = await prisma.product.findFirst({ where: { id, collaboratorId: req.userId! } })
  if (!existing) {
    res.status(404).json({ error: 'Not found or not yours' })
    return
  }

  await prisma.product.update({ where: { id }, data: { isActive: false } })
  res.json({ ok: true })
})

// GET /:id/inventory — inventory stats (ownership check)
router.get('/:id/inventory', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.id)
  const product = await prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } })
  if (!product) { res.status(404).json({ error: 'Not found' }); return }
  const [total, unsold] = await Promise.all([
    prisma.cardInventory.count({ where: { productId } }),
    prisma.cardInventory.count({ where: { productId, sold: false } }),
  ])
  res.json({ total, unsold, sold: total - unsold })
})

// POST /:id/inventory/bulk — bulk upload CC lines (ownership check)
router.post('/:id/inventory/bulk', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.id)
  const product = await prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } })
  if (!product) { res.status(404).json({ error: 'Not found' }); return }
  const { lines } = req.body as { lines: string[] }
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: 'lines array required' }); return
  }
  const valid = lines.filter(l => /^\d{13,19}/.test(l.trim())).map(l => l.trim())
  if (valid.length === 0) { res.status(400).json({ error: 'No valid CC lines found' }); return }
  await prisma.cardInventory.createMany({ data: valid.map(fullData => ({ productId, fullData })) })
  const unsold = await prisma.cardInventory.count({ where: { productId, sold: false } })
  await prisma.product.update({ where: { id: productId }, data: { stock: unsold } })
  res.json({ added: valid.length, stock: unsold })
})

export default router
