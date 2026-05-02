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

  if (!categoryId || !name || price == null) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const product = await prisma.product.create({
    data: {
      categoryId: parseInt(categoryId),
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

export default router
