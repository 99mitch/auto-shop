import { Router } from 'express'
import { bot } from '../bot'

const router = Router()

router.post('/', async (req, res) => {
  try {
    await bot.handleUpdate(req.body)
    res.json({ ok: true })
  } catch (err) {
    console.error('[webhook] Error handling update:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
