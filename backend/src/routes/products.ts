import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

function parseProduct(p: any) {
  return { ...p, images: JSON.parse(p.images) }
}

router.get('/', authMiddleware, async (req, res) => {
  const { category, search } = req.query

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category ? { category: { slug: String(category) } } : {}),
      ...(search ? { name: { contains: String(search) } } : {}),
    },
    include: { category: true },
    orderBy: { id: 'asc' },
  })

  res.json(products.map(parseProduct))
})

router.get('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product id' })
    return
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!product || !product.isActive) {
    res.status(404).json({ error: 'Product not found' })
    return
  }

  res.json(parseProduct(product))
})

export default router
