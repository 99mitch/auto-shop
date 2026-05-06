import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: number
  telegramId: string
}

interface WebJwtPayload extends JwtPayload {
  web: true
  isSuperAdmin: boolean
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '15m' })
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload
}

export function signWebJwt(payload: JwtPayload & { isSuperAdmin: boolean }): string {
  return jwt.sign({ ...payload, web: true }, getSecret(), { expiresIn: '7d' })
}

export function verifyWebJwt(token: string): WebJwtPayload {
  const decoded = jwt.verify(token, getSecret()) as any
  if (!decoded.web) throw new Error('Not a web token')
  return decoded as WebJwtPayload
}
