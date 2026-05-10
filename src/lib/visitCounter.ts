import { Redis } from '@upstash/redis'

// Single counter key. Bump if the storage strategy ever changes (e.g. swap to
// a sorted set for daily breakdowns) so old values don't collide.
const KEY = 'resume:visits:v1'

let cachedClient: Redis | null = null

function getClient(): Redis | null {
  if (cachedClient) return cachedClient
  // Support both env-var conventions:
  //   - UPSTASH_REDIS_REST_* — Upstash marketplace integration on Vercel
  //   - KV_REST_API_*        — legacy Vercel KV integration
  // Both point at the same Upstash backend.
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[visitCounter] Redis not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN). Counter chip is hidden until then.'
      )
    }
    return null
  }
  cachedClient = new Redis({ url, token })
  return cachedClient
}

/**
 * Returns the current visit count, or `null` if the counter isn't configured
 * (missing env vars) or the read fails. Callers should hide the UI when null
 * — never invent a placeholder number, that would mislead.
 */
export async function getResumeVisits(): Promise<number | null> {
  const redis = getClient()
  if (!redis) return null
  try {
    const value = await redis.get<number>(KEY)
    return value ?? 0
  } catch (err) {
    console.warn('[visitCounter] get failed:', err)
    return null
  }
}

/**
 * Atomically bumps the counter. Cookie-based dedup happens in the caller
 * (Server Action) so this stays a pure storage operation.
 */
export async function incrementResumeVisits(): Promise<number | null> {
  const redis = getClient()
  if (!redis) return null
  try {
    return await redis.incr(KEY)
  } catch (err) {
    console.warn('[visitCounter] incr failed:', err)
    return null
  }
}
