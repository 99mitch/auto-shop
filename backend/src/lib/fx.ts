import axios from 'axios'

let cachedRate: { value: number; ts: number } | null = null
const TTL_MS = 15 * 60 * 1000

export async function getEurUsdRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.ts < TTL_MS) return cachedRate.value
  try {
    const { data } = await axios.get('https://api.frankfurter.dev/v1/latest?from=EUR&to=USD', { timeout: 5_000 })
    const rate = Number(data?.rates?.USD)
    if (!isFinite(rate) || rate <= 0) throw new Error('Invalid FX rate response')
    cachedRate = { value: rate, ts: Date.now() }
    return rate
  } catch (err) {
    if (cachedRate) {
      console.warn('[fx] EUR/USD fetch failed, using stale rate:', (err as Error).message)
      return cachedRate.value
    }
    throw err
  }
}

export async function eurToUsd(eur: number): Promise<{ usd: number; rate: number }> {
  const rate = await getEurUsdRate()
  return { usd: parseFloat((eur * rate).toFixed(2)), rate }
}
