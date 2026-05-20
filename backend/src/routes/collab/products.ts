import { Router } from 'express'
import { prisma } from '../../prisma'
import { AuthRequest } from '../../middleware/auth'
import { matchAndDeliver } from '../../lib/preorderMatcher'
import { deliverCards } from '../../lib/notify'
import { bot } from '../../bot'
import { setSession, clearSession, getPending, clearPending } from '../../lib/collabBotSession'

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

  if (!name) {
    res.status(400).json({ error: 'Missing required field: name' })
    return
  }

  const cost = costEur != null ? parseFloat(costEur) : 0
  if (!Number.isFinite(cost) || cost < 0) {
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

// GET /bot-upload — récupère l'upload bot en attente de confirmation
router.get('/bot-upload', async (req: AuthRequest, res) => {
  const pending = getPending(req.userId!)
  if (!pending) { res.json(null); return }
  res.json({ productId: pending.productId, count: pending.cards.length, preview: pending.cards.slice(0, 5) })
})

// POST /bot-upload/confirm — confirme et sauvegarde les cartes en attente
router.post('/bot-upload/confirm', async (req: AuthRequest, res) => {
  const pending = getPending(req.userId!)
  if (!pending) { res.status(404).json({ error: 'Aucun upload en attente' }); return }

  const product = await prisma.product.findFirst({ where: { id: pending.productId, collaboratorId: req.userId! } })
  if (!product) { res.status(404).json({ error: 'Produit introuvable' }); return }

  await prisma.cardInventory.createMany({
    data: pending.cards.map(line => ({ productId: pending.productId, fullData: parseCardLine(line) })),
  })
  const unsold = await prisma.cardInventory.count({ where: { productId: pending.productId, sold: false } })
  await prisma.product.update({ where: { id: pending.productId }, data: { stock: unsold } })
  clearPending(req.userId!)
  matchAndDeliver(pending.productId).catch(err => console.warn('[matcher]', err))
  res.json({ added: pending.cards.length, stock: unsold })
})

// DELETE /bot-upload — annule l'upload bot en attente
router.delete('/bot-upload', async (req: AuthRequest, res) => {
  clearPending(req.userId!)
  res.json({ ok: true })
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

// GET /:id/inventory/list — liste toutes les cartes d'un produit (collab)
router.get('/:id/inventory/list', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.id)
  const product = await prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } })
  if (!product) { res.status(404).json({ error: 'Not found' }); return }
  const cards = await prisma.cardInventory.findMany({
    where: { productId },
    orderBy: { id: 'desc' },
    select: { id: true, fullData: true, sold: true, createdAt: true },
  })
  res.json(cards)
})

// DELETE /:productId/inventory/:cardId — supprime une carte non vendue
router.delete('/:productId/inventory/:cardId', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.productId)
  const cardId = parseInt(req.params.cardId)

  const product = await prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } })
  if (!product) { res.status(404).json({ error: 'Produit introuvable' }); return }

  const card = await prisma.cardInventory.findFirst({ where: { id: cardId, productId } })
  if (!card) { res.status(404).json({ error: 'Carte introuvable' }); return }
  if (card.sold) { res.status(400).json({ error: 'Impossible de supprimer une carte déjà vendue' }); return }

  await prisma.cardInventory.delete({ where: { id: cardId } })
  const unsold = await prisma.cardInventory.count({ where: { productId, sold: false } })
  await prisma.product.update({ where: { id: productId }, data: { stock: unsold } })
  res.json({ ok: true, stock: unsold })
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

// POST /bot-ping — diagnostic : envoie juste un message test au Telegram du collab
router.post('/bot-ping', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  console.log(`[bot-ping] userId=${req.userId} telegramId=${user?.telegramId ?? 'null'}`)

  if (!user?.telegramId) {
    res.status(400).json({ error: 'Aucun Telegram lié à ce compte (user.telegramId est null)' })
    return
  }

  const botUsername = bot.botInfo?.username ? `@${bot.botInfo.username}` : '(bot non initialisé)'

  try {
    const result = await bot.api.sendMessage(
      user.telegramId,
      `🏓 <b>Test ping</b>\n\nSi tu vois ce message, le bot peut bien te joindre.\n\n• Bot: ${botUsername}\n• telegramId: <code>${user.telegramId}</code>`,
      { parse_mode: 'HTML' }
    )
    console.log(`[bot-ping] success messageId=${result.message_id}`)
    res.json({ ok: true, botUsername, telegramId: user.telegramId, messageId: result.message_id })
  } catch (err: any) {
    const msg = err?.description ?? err?.message ?? String(err)
    const code = err?.error_code ?? err?.status ?? 'unknown'
    console.error(`[bot-ping] FAIL code=${code} msg=${msg}`)
    res.status(400).json({
      error: `Échec envoi (${code}) : ${msg}`,
      botUsername,
      telegramId: user.telegramId,
      hint: msg.includes('403') || msg.includes('Forbidden')
        ? `Tu n'as pas démarré ${botUsername} OU tu l'as bloqué. Envoie /start à ${botUsername} dans Telegram.`
        : msg.includes('chat not found') || msg.includes('400')
        ? `Le telegramId ${user.telegramId} est introuvable côté Telegram. Vérifie qu'il correspond à ton compte.`
        : `Erreur inattendue.`,
    })
  }
})

// POST /:id/inventory/bot-session — démarre une session bot (le bot envoie un message au collab)
router.post('/:id/inventory/bot-session', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.id)
  console.log(`[bot-session] userId=${req.userId} productId=${productId}`)

  // Cherche le produit en ignorant collaboratorId si l'utilisateur est admin
  const [productOwned, productAny, user] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } }),
    prisma.product.findFirst({ where: { id: productId } }),
    prisma.user.findUnique({ where: { id: req.userId! } }),
  ])

  const product = productOwned ?? productAny
  console.log(`[bot-session] product=${product?.id ?? 'null'} user.telegramId=${user?.telegramId ?? 'null'}`)

  if (!product) { res.status(404).json({ error: 'Produit introuvable' }); return }
  if (!user?.telegramId) { res.status(400).json({ error: 'Aucun Telegram lié à ce compte' }); return }

  setSession(user.telegramId, productId, req.userId!)

  const botUsername = bot.botInfo?.username ? `@${bot.botInfo.username}` : 'le bot'

  try {
    await bot.api.sendMessage(
      user.telegramId,
      `🃏 <b>Mode réception activé</b>\n\nEnvoie tes cartes ici, une par ligne :\n<code>pan|expiry|cvv|titulaire|ddn|adresse|ville|email|tel|ip</code>\n\n⏱ Session valide 10 minutes.`,
      { parse_mode: 'HTML' }
    )
    console.log(`[bot-session] message envoyé à telegramId=${user.telegramId}`)
  } catch (err: any) {
    clearSession(user.telegramId)
    const msg = err?.description ?? String(err)
    console.error(`[bot-session] sendMessage échoué:`, msg)
    const hint = msg.includes('403') || msg.includes('Forbidden')
      ? `Tu dois d'abord envoyer /start à ${botUsername} dans Telegram avant de pouvoir recevoir des messages.`
      : `Impossible d'envoyer le message Telegram : ${msg}`
    res.status(400).json({ error: hint }); return
  }

  res.json({ ok: true })
})

// POST /:id/inventory/test-delivery — envoie une carte test au Telegram du collab
router.post('/:id/inventory/test-delivery', async (req: AuthRequest, res) => {
  const productId = parseInt(req.params.id)

  const [product, user] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, collaboratorId: req.userId! } }),
    prisma.user.findUnique({ where: { id: req.userId! } }),
  ])
  if (!product) { res.status(404).json({ error: 'Not found' }); return }
  if (!user?.telegramId) { res.status(400).json({ error: 'Aucun Telegram lié à ce compte' }); return }

  const sample = await prisma.cardInventory.findFirst({
    where: { productId, sold: false },
    orderBy: { id: 'asc' },
  })
  if (!sample) { res.status(404).json({ error: 'Aucune carte disponible dans l\'inventaire' }); return }

  let meta: Record<string, string> = {}
  try { meta = JSON.parse(product.description || '{}') } catch {}

  await deliverCards(user.telegramId, 0, [{
    productName: product.name,
    data: sample.fullData,
    meta: {
      bin: meta.bin,
      bank: meta.bank,
      network: meta.network,
      level: meta.level,
      type: meta.type,
      device: meta.device,
      source: meta.source,
      ddn: meta.ddn,
      age: meta.age ? String(meta.age) : undefined,
      cp: meta.cp,
    },
  }])

  res.json({ ok: true })
})

export default router
