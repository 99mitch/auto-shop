import { Bot, InlineKeyboard } from 'grammy'
import { getSession, clearSession, setPending } from './lib/collabBotSession'

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) throw new Error('BOT_TOKEN environment variable is required')

export const bot = new Bot(BOT_TOKEN)

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-mini-app.vercel.app'

bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🃏 Ouvrir la boutique', MINI_APP_URL)

  try {
    await ctx.replyWithPhoto(`${MINI_APP_URL}/logo.svg`, {
      caption:
        '🃏 *Bienvenue sur Fullz*\n\n' +
        'Le marketplace de référence\\.\n' +
        'CC, fullz, données — tout au même endroit\\.',
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    })
  } catch {
    await ctx.reply(
      '🃏 *Bienvenue sur Fullz*\n\nCC, fullz et données en accès direct.',
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
  }
})

bot.command('shop', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🃏 Ouvrir la boutique', MINI_APP_URL)
  await ctx.reply('Accédez à la boutique :', { reply_markup: keyboard })
})

// Réception de cartes depuis un collab en session active
bot.on('message:text', async (ctx) => {
  const telegramId = String(ctx.from?.id)
  const session = getSession(telegramId)
  if (!session) return

  const text = ctx.message.text
  const isTreeFormat = /\b(?:Num[ée]ro|Nom\s*Complet|Titulaire|CVV)\s*:/i.test(text)

  let lines: string[]
  if (isTreeFormat) {
    // Format arborescence : un message = une carte (multi-lignes).
    // Découpe sur les marqueurs "Nom Complet:" pour gérer plusieurs cartes collées d'affilée.
    const blocks = text.split(/(?=\n?\s*[^\n]*?(?:👤\s*)?Nom\s*Complet\s*:)/i)
      .map(b => b.trim())
      .filter(b => b && /\d{13,19}/.test(b))
    lines = blocks
  } else {
    lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && /\d{13,19}/.test(l))
  }

  if (lines.length === 0) {
    await ctx.reply(
      '⚠️ Aucune carte détectée.\n\nFormats acceptés :\n\n1. Pipe (1 carte par ligne) :\n<code>pan|expiry|cvv|titulaire|ddn|adresse|ville|email|tel|ip|cp|ua</code>\n\n2. Arborescence (collé depuis un autre bot, avec libellés "Numéro:", "CVV:", "Nom Complet:"…)',
      { parse_mode: 'HTML' }
    )
    return
  }

  setPending(session.collabId, session.productId, lines)
  clearSession(telegramId)

  const preview = lines.slice(0, 5).map((l, i) => {
    const pan = l.match(/\b(\d{13,19})\b/)?.[1] ?? '?'
    const masked = pan.length > 4 ? '●●●● ' + pan.slice(-4) : pan
    return `${i + 1}. ${masked}`
  }).join('\n')
  const more = lines.length > 5 ? `\n…et ${lines.length - 5} autre${lines.length - 5 > 1 ? 's' : ''}` : ''

  const keyboard = new InlineKeyboard().webApp('📱 Confirmer dans la mini app', MINI_APP_URL + '/collab')
  await ctx.reply(
    `✅ <b>${lines.length} carte${lines.length > 1 ? 's' : ''} détectée${lines.length > 1 ? 's' : ''}</b>\n\n${preview}${more}\n\n📱 Ouvre la mini app pour confirmer ou annuler l'ajout.`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  )
})
