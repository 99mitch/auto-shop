import axios from 'axios'

const client = axios.create({
  baseURL: process.env.CRYPTO_API_URL || 'http://deploy-crypto-api-1:3000',
  headers: { 'X-Admin-Key': process.env.CRYPTO_API_ADMIN_KEY || '' },
  timeout: 10_000,
})

export interface CryptoPaymentResult {
  paymentId: string
  walletAddress: string
  qrCode: string
  expiresAt: string
  status: string
}

export async function createCryptoPayment(
  amount: number,
  description: string,
  metadata: Record<string, unknown>
): Promise<CryptoPaymentResult> {
  const { data } = await client.post('/api/payments', { amount, description, metadata })
  return data.payment
}

export async function getCryptoPaymentStatus(paymentId: string): Promise<{ status: string; receivedAmount: number; expiresAt: string }> {
  const { data } = await client.get(`/api/payments/${paymentId}/status`)
  return data
}
