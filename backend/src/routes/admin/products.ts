import { Router } from 'express'
import { prisma } from '../../prisma'
import { CreateProductSchema, UpdateProductSchema } from 'floramini-types'

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

export default router
