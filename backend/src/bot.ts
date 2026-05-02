import { Bot, InlineKeyboard } from 'grammy'

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) throw new Error('BOT_TOKEN environment variable is required')

export const bot = new Bot(BOT_TOKEN)

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-mini-app.vercel.app'

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🃏 Accéder à la boutique', MINI_APP_URL)
  await ctx.reply(
    '🃏 *Bienvenue sur Fullz*\n\nAccédez au catalogue, passez vos commandes et recevez vos fichiers directement ici.',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  )
})

bot.command('shop', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🃏 Ouvrir la boutique', MINI_APP_URL)
  await ctx.reply('Accédez à la boutique :', { reply_markup: keyboard })
})
