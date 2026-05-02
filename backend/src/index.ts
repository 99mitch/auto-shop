import 'dotenv/config'
import { app } from './app'
import { bot } from './bot'

const PORT = parseInt(process.env.PORT || '3001', 10)

async function start() {
  await bot.init()
  console.log(`🤖 Bot @${bot.botInfo.username} initialized`)

  // Delete any existing webhook so long polling works
  await bot.api.deleteWebhook()

  app.listen(PORT, () => {
    console.log(`🌸 FloraMini backend running on http://localhost:${PORT}`)
  })

  bot.start({
    onStart: (info) => console.log(`🤖 Bot polling started — @${info.username}`),
  })
}

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
