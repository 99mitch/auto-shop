import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: number
  telegramId: string
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
