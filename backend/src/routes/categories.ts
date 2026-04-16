import { Router } from 'express'
import { prisma } from '../prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } })
  res.json(categories)
})

export default router
