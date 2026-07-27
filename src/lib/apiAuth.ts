import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Manual/VPS triggers: x-sync-secret header vs SYNC_SECRET env. */
export function isSyncAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET
  const header = req.headers.get('x-sync-secret')
  if (!secret || !header) return false
  return safeEqual(header, secret)
}

/** Vercel cron invocations: Authorization: Bearer <CRON_SECRET>. */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get('authorization')
  if (!secret || !header) return false
  return safeEqual(header, `Bearer ${secret}`)
}
