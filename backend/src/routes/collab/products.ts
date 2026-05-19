import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'
import { matchAndDeliver } from '../../lib/preorderMatcher'

const router = Router()

function parseImages(raw: string): string[] {
  try { return JSON.parse(raw) } catch { return [] }
}

router.get('/', async (req: AuthRequest, res) => {
  const products = await prisma.product.findMany({
    where: { collaboratorId: req.userId! },
    include: { category: true },
    orderBy: { id: 'desc' },
  })
  res.json(products.map((p) => ({ ...p, images: parseImages(p.images) })))
})

router.post('/', async (req: AuthRequest, res) => {
  const { categoryId, name, description, costEur, stock, imageUrl, images } = req.body

  if (!name || costEur == null) {
    res.status(400).json({ error: 'Missing required fields (name, costEur)' })
    return
  }

  const cost = parseFloat(costEur)
  if (!Number.isFinite(cost) || cost <= 0) {
    res.status(400).json({ error: 'costEur must be a positive number' })
    return
  }

  const product = await prisma.product.create({
    data: {
      categoryId: categoryId ? parseInt(categoryId) : null,
      name,
      description: description ?? '',
      price: cost,
      costEur: cost,
      stock: parseInt(stock ?? 0),
      imageUrl: imageUrl ?? '',
      images: JSON.stringify(images ?? []),
      collaboratorId: req.userId!,
      isActive: false,
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

  const { name, description, costEur, stock, imageUrl, images } = req.body

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(costEur !== undefined && { costEur: parseFloat(costEur) }),
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

// Parse a raw card line into structured JSON for delivery formatting
function parseCardLine(raw: string): string {
  const line = raw.trim()
  if (!line) return line

  // Already valid JSON with card fields → keep as-is
  try {
    const j = JSON.parse(line)
    if (typeof j === 'object' && j !== null && (j.numero || j.pan)) return line
  } catch {}

  const result: Record<string, string> = {}

  // Pipe-separated: pan|expiry|cvv|titulaire|ddn|adresse|ville|email|telephone|ip
  const parts = line.split('|').map(p => p.trim())
  if (parts.length >= 3) {
    if (/^\d{13,19}$/.test(parts[0])) result.numero = parts[0]
    if (/^\d{2}\/\d{2,4}$/.test(parts[1])) result.expiration = parts[1]
    if (/^\d{3,4}$/.test(parts[2])) result.cvv = parts[2]
    if (parts[3]) { result.titulaire = parts[3]; result.nom = parts[3] }
    if (parts[4]) result.ddn = parts[4]
    if (parts[5]) result.adresse = parts[5]
    if (parts[6]) result.ville = parts[6]
    if (parts[7] && parts[7].includes('@')) result.email = parts[7]
    else if (parts[7]) result.telephone = parts[7]
    if (parts[8] && parts[8].includes('@')) result.email = parts[8]
    else if (parts[8]) result.telephone = parts[8]
    if (parts[9]) result.ip = parts[9]
    if (parts[10]) result.ip = parts[10]
  }

  // Regex auto-detection to fill missing fields
  if (!result.email) {
    const m = line.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/)
    if (m) result.email = m[0]
  }
  if (!result.ip) {
    const m = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)
    if (m) result.ip = m[0]
  }
  if (!result.telephone) {
    const m = line.match(/\b(?:0[67]\d{8}|\+33\d{9,10}|\+\d{11,13})\b/)
    if (m) result.telephone = m[0]
  }
  if (!result.numero) {
    const m = line.match(/\b\d{13,19}\b/)
    if (m) result.numero = m[0]
  }

  // Return JSON if we extracted at least the card number
  if (result.numero) return JSON.stringify(result)

  // Fallback: raw string
  return line
}

// POST /:id/inventory/bulk — bulk upload CC lines (ownership check)
router.post('/:id/inventory/bulk', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.id)
  const product = await prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } })
  if (!product) { res.status(404).json({ error: 'Not found' }); return }
  const { lines } = req.body as { lines: string[] }
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: 'lines array required' }); return
  }
  // Accept any line that contains a card number (13–19 digits) anywhere
  const valid = lines.map(l => l.trim()).filter(l => /\d{13,19}/.test(l))
  if (valid.length === 0) { res.status(400).json({ error: 'No valid CC lines found' }); return }
  await prisma.cardInventory.createMany({
    data: valid.map(line => ({ productId, fullData: parseCardLine(line) })),
  })
  const unsold = await prisma.cardInventory.count({ where: { productId, sold: false } })
  await prisma.product.update({ where: { id: productId }, data: { stock: unsold } })

  // Déclencher le matching des précommandes (fire-and-forget)
  matchAndDeliver(productId).catch((err) => console.warn('[matcher] Error:', err))

  res.json({ added: valid.length, stock: unsold })
})

export default router
