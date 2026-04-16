import 'dotenv/config'
import { Bot, InlineKeyboard } from 'grammy'

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) throw new Error('BOT_TOKEN environment variable is required')

export const bot = new Bot(BOT_TOKEN)

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-mini-app.vercel.app'

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🌸 Ouvrir la boutique', MINI_APP_URL)
  await ctx.reply(
    '🌸 *Bienvenue chez FloraMini !*\n\n' +
      'Découvrez notre collection de fleurs fraîches, plantes et compositions florales.\n\n' +
      '🚚 Livraison rapide à domicile du mardi au samedi.',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  )
})

bot.command('orders', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('📦 Mes commandes', `${MINI_APP_URL}/orders`)
  await ctx.reply('Retrouvez toutes vos commandes ici :', { reply_markup: keyboard })
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    '❓ *Aide FloraMini*\n\n' +
      '🚚 *Livraison* : Du mardi au samedi, de 9h à 19h.\n\n' +
      '↩️ *Retours* : Vous avez 24h après réception pour signaler un problème.\n\n' +
      '⏱️ *Délai* : Commandez avant 14h pour une livraison le lendemain.\n\n' +
      '📞 *Contact* : Répondez à ce message ou écrivez à support@floramini.fr',
    { parse_mode: 'Markdown' }
  )
})
