import '../setup'
import { signJwt, verifyJwt } from '../../src/lib/jwt'

describe('JWT utilities', () => {
  const payload = { userId: 1, telegramId: '123456' }

  it('signs and verifies a token', () => {
    const token = signJwt(payload)
    expect(typeof token).toBe('string')
    const decoded = verifyJwt(token)
    expect(decoded.userId).toBe(payload.userId)
    expect(decoded.telegramId).toBe(payload.telegramId)
  })

  it('throws for an invalid token', () => {
    expect(() => verifyJwt('invalid.token.here')).toThrow()
  })

  it('throws for a tampered token', () => {
    const token = signJwt(payload)
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => verifyJwt(tampered)).toThrow()
  })
})
