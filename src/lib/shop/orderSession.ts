export const ORDER_SESSION_COOKIE = 'order_session'

/**
 * The order_session cookie holds a JSON array of session tokens (newest last)
 * so a split checkout (ship + pickup = two orders) keeps guest access to both
 * confirmation pages. Legacy cookies hold a single bare token string.
 */
const MAX_TOKENS = 5

export function parseOrderSessions(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string')
  } catch {
    // legacy single-token cookie
  }
  return [raw]
}

export function appendOrderSession(raw: string | undefined, token: string): string {
  const tokens = parseOrderSessions(raw).filter(t => t !== token)
  tokens.push(token)
  return JSON.stringify(tokens.slice(-MAX_TOKENS))
}

/**
 * A split checkout (mixed cart → ship + pickup orders) uses session_id
 * `{uuid}-ship` / `{uuid}-pickup` for the two legs. Given one, derive the
 * other so the two orders can be cross-linked — returns null for a
 * non-split (plain) session id.
 */
export function getSiblingSessionId(sessionId: string): string | null {
  if (sessionId.endsWith('-ship')) return sessionId.slice(0, -'-ship'.length) + '-pickup'
  if (sessionId.endsWith('-pickup')) return sessionId.slice(0, -'-pickup'.length) + '-ship'
  return null
}
