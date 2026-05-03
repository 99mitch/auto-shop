import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

router.get('/', async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { order: 'asc' } })
  res.json(cats)
})

router.post('/', async (req, res) => {
  const { slug, name, order } = req.body
  if (!slug || !name) { res.status(400).json({ error: 'slug and name required' }); return }
  const cat = await prisma.category.create({ data: { slug, name, order: order ?? 0 } })
  res.json(cat)
})

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { name, order } = req.body
  const cat = await prisma.category.update({ where: { id }, data: { ...(name && { name }), ...(order !== undefined && { order }) } })
  res.json(cat)
})

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  await prisma.category.delete({ where: { id } })
  res.json({ ok: true })
})

export default router
