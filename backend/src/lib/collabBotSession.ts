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

export function getPending(collabId: number): PendingUpload | null {
  const p = pendingUploads.get(collabId)
  if (!p) return null
  if (p.expiresAt < new Date()) { pendingUploads.delete(collabId); return null }
  return p
}

export function clearPending(collabId: number) {
  pendingUploads.delete(collabId)
}
