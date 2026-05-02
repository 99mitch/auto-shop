import { Router } from 'express'
import { InputFile } from 'grammy'
import { bot } from '../bot'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

const EXT: Record<string, string> = { TXT: 'txt', JSON: 'json', CSV: 'csv', BASE64: 'txt' }

router.post('/', async (req: AuthRequest, res) => {
  const { deliveries, format } = req.body as {
    deliveries: { productName: string; payload: string }[]
    format: string
  }

  if (!deliveries?.length || !format) {
    res.status(400).json({ error: 'Missing deliveries or format' })
    return
  }

  const telegramId = req.telegramId!

  try {
    // Build combined file content
    const content = deliveries.length === 1
      ? deliveries[0].payload
      : deliveries.map((d, i) => `=== CARTE ${i + 1}: ${d.productName.toUpperCase()} ===\n${d.payload}`).join('\n\n')

    const ext = EXT[format] ?? 'txt'
    const filename = `fullz_${Date.now()}.${ext}`
    const buffer = Buffer.from(content, 'utf-8')

    // Caption
    const caption =
      `✅ <b>${deliveries.length} carte${deliveries.length > 1 ? 's' : ''} livrée${deliveries.length > 1 ? 's' : ''}</b>\n` +
      `Format : <code>${format}</code>\n` +
      deliveries.map((d) => `• ${d.productName}`).join('\n')

    await bot.api.sendDocument(telegramId, new InputFile(buffer, filename), {
      caption,
      parse_mode: 'HTML',
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('[deliver]', err)
    res.status(500).json({ error: 'Failed to deliver' })
  }
})

export default router
