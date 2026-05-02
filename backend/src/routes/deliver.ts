import { Router } from 'express'
import { InputFile } from 'grammy'
import { bot } from '../bot'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

const EXT: Record<string, string> = { TXT: 'txt', JSON: 'json', CSV: 'csv' }

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildTelegramMessage(productName: string, payload: string): string {
  const lines = payload.split('\n')
  const rows = lines.map((line) => {
    const idx = line.indexOf(':')
    if (idx === -1) return escapeHtml(line)
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    return `<b>${escapeHtml(key)}</b>  <code>${escapeHtml(val)}</code>`
  })
  return `🃏 <b>${escapeHtml(productName)}</b>\n\n${rows.join('\n')}`
}

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
    if (format === 'MESSAGE') {
      // Send one message per card
      for (const delivery of deliveries) {
        await bot.api.sendMessage(
          telegramId,
          buildTelegramMessage(delivery.productName, delivery.payload),
          { parse_mode: 'HTML' }
        )
      }
    } else {
      // Send a single combined file
      const content = deliveries.length === 1
        ? deliveries[0].payload
        : deliveries.map((d, i) => `=== CARTE ${i + 1}: ${d.productName.toUpperCase()} ===\n${d.payload}`).join('\n\n')

      const ext = EXT[format] ?? 'txt'
      const filename = `fullz_${Date.now()}.${ext}`
      const caption =
        `✅ <b>${deliveries.length} carte${deliveries.length > 1 ? 's' : ''}</b> · <code>${format}</code>\n` +
        deliveries.map((d) => `• ${escapeHtml(d.productName)}`).join('\n')

      await bot.api.sendDocument(
        telegramId,
        new InputFile(Buffer.from(content, 'utf-8'), filename),
        { caption, parse_mode: 'HTML' }
      )
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[deliver]', err)
    res.status(500).json({ error: 'Failed to deliver' })
  }
})

export default router
