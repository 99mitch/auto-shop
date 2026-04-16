import { bot } from './index'

console.log('🤖 Starting bot in polling mode...')

bot.start({
  onStart: (info) => {
    console.log(`🌸 Bot @${info.username} is running (polling)`)
  },
})
