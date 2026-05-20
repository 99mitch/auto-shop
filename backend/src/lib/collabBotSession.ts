interface BotSession {
  productId: number
  collabId: number
  expiresAt: Date
}

interface PendingUpload {
  productId: number
  collabId: number
  cards: string[]   // raw lines, confirmed → parsed by parseCardLine on confirm
  expiresAt: Date
}

// telegramId → session active (bot en attente de cartes)
const activeSessions = new Map<string, BotSession>()

// collabId → upload en attente de confirmation dans la mini app
const pendingUploads = new Map<number, PendingUpload>()

export function setSession(telegramId: string, productId: number, collabId: number) {
  activeSessions.set(telegramId, {
    productId,
    collabId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })
}

export function getSession(telegramId: string): BotSession | null {
  const s = activeSessions.get(telegramId)
  if (!s) return null
  if (s.expiresAt < new Date()) { activeSessions.delete(telegramId); return null }
  return s
}

export function clearSession(telegramId: string) {
  activeSessions.delete(telegramId)
}

export function setPending(collabId: number, productId: number, cards: string[]) {
  pendingUploads.set(collabId, {
    productId,
    collabId,
    cards,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  })
}

// Append cards to an existing pending upload, or create one if none exists.
// Returns the new cumulative total of cards waiting.
export function appendPending(collabId: number, productId: number, cards: string[]): number {
  const existing = pendingUploads.get(collabId)
  if (existing && existing.productId === productId && existing.expiresAt >= new Date()) {
    existing.cards.push(...cards)
    existing.expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    return existing.cards.length
  }
  setPending(collabId, productId, cards)
  return cards.length
}

// Renew the session expiry without changing the rest.
export function touchSession(telegramId: string) {
  const s = activeSessions.get(telegramId)
  if (!s) return
  s.expiresAt = new Date(Date.now() + 10 * 60 * 1000)
}

export function getPending(collabId: number): PendingUpload | null {
  const p = pendingUploads.get(collabId)
  if (!p) return null
  if (p.expiresAt < new Date()) { pendingUploads.delete(collabId); return null }
  return p
}

export function clearPending(collabId: number) {
  pendingUploads.delete(collabId)
}
