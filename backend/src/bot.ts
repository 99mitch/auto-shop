import { Bot, InlineKeyboard } from 'grammy'
import { getSession, appendPending, touchSession, getPending } from './lib/collabBotSession'

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
    // Format arborescence : chaque MESSAGE = 1 carte par défaut.
    // Si l'utilisateur a collé plusieurs blocs dans un seul message, on découpe
    // sur les marqueurs "Nom Complet:" pour les séparer.
    const blocks = text.split(/(?=\n?\s*[^\n]*?(?:👤\s*)?Nom\s*Complet\s*:)/i)
      .map(b => b.trim())
      .filter(b => b && /\d{13,19}/.test(b))
    // Garantit au moins 1 unité si le message contient un PAN
    lines = blocks.length > 0 ? blocks : (text.trim() && /\d{13,19}/.test(text) ? [text.trim()] : [])
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

  // Ajoute à la pile en attente et renouvelle la session (envois multiples).
  const total = appendPending(session.collabId, session.productId, lines)
  touchSession(telegramId)

  const all = getPending(session.collabId)?.cards ?? lines
  const tail = all.slice(-5)
  const startIdx = Math.max(0, total - tail.length)
  const preview = tail.map((l, i) => {
    const pan = l.match(/\b(\d{13,19})\b/)?.[1] ?? '?'
    const masked = pan.length > 4 ? '●●●● ' + pan.slice(-4) : pan
    return `${startIdx + i + 1}. ${masked}`
  }).join('\n')
  const hiddenCount = total - tail.length
  const more = hiddenCount > 0 ? `\n…et ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} avant` : ''

  const justAdded = lines.length
  const keyboard = new InlineKeyboard().webApp('📱 Confirmer dans la mini app', MINI_APP_URL + '/collab')
  await ctx.reply(
    `✅ <b>+${justAdded} carte${justAdded > 1 ? 's' : ''}</b>  ·  Total : <b>${total}</b>\n\n${preview}${more}\n\n📨 Tu peux continuer d'envoyer d'autres cartes. Ouvre la mini app quand tu veux confirmer.`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  )
})
