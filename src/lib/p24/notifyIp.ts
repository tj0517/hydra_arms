// Pure IP-allowlist helpers for the P24 notify webhook (HA-2.20) — no
// server-only imports, no side effects, so they can be unit-tested directly.
//
// The allowlist itself never lives in code: it comes from the
// P24_NOTIFY_ALLOWED_IPS environment variable (see config/inputs.ts).
// Source of the values: official Przelewy24 documentation, section
// "Adresy IP serwerów" / "Server IP addresses"
// (https://developers.przelewy24.pl/ — PL/EN OpenAPI spec at
// /yaml/pl_documentation_1.0.yaml and /yaml/en_documentation_1.0.yaml).
// The documentation publishes one list for "serwery Przelewy24" and does NOT
// split it into sandbox and production ranges.

import { getP24Mode, type P24Mode } from './mode'

/**
 * Parses the comma-separated allowlist.
 * Entries may be a bare IPv4 address or an IPv4 CIDR range (the P24 docs use
 * both: single addresses plus /24, /28 and /29 ranges).
 * An unset, empty or whitespace-only value yields an empty list, which the
 * caller treats as "no list configured".
 */
export function parseAllowedIps(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/** IPv4 dotted-quad → unsigned 32-bit integer, or null if not a valid IPv4. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let acc = 0
  for (const part of parts) {
    // Reject empty parts, non-digits and leading zeros ('01') to avoid
    // ambiguous/octal-looking input.
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    acc = acc * 256 + n
  }
  return acc
}

/**
 * Normalises a client IP for matching:
 *  - strips an IPv4-mapped IPv6 prefix ('::ffff:5.252.202.254' → '5.252.202.254')
 *  - strips a trailing ':port' from 'a.b.c.d:1234'
 *  - strips surrounding brackets from '[::1]'
 * Anything else is returned trimmed and unchanged (an IPv6 client simply will
 * not match the IPv4-only P24 list, and is therefore rejected).
 */
export function normaliseIp(ip: string): string {
  let s = ip.trim()
  if (s.startsWith('[') && s.includes(']')) s = s.slice(1, s.indexOf(']'))
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(s)
  if (mapped) return mapped[1]
  // 'a.b.c.d:port' — only when there is exactly one colon (never IPv6)
  if ((s.match(/:/g) ?? []).length === 1 && s.includes('.')) s = s.split(':')[0]
  return s
}

/** True when `ip` equals `entry` or falls inside `entry` as an IPv4 CIDR range. */
export function ipMatchesEntry(ip: string, entry: string): boolean {
  const slash = entry.indexOf('/')
  if (slash === -1) {
    const a = ipv4ToInt(ip)
    const b = ipv4ToInt(entry)
    // Both parse as IPv4 → compare numerically; otherwise fall back to an
    // exact string match so a non-IPv4 entry still works as a literal.
    if (a !== null && b !== null) return a === b
    return ip === entry
  }

  const base = ipv4ToInt(entry.slice(0, slash))
  const bitsRaw = entry.slice(slash + 1)
  if (base === null || !/^(0|[1-9][0-9]?)$/.test(bitsRaw)) return false
  const bits = Number(bitsRaw)
  if (bits > 32) return false

  const addr = ipv4ToInt(ip)
  if (addr === null) return false

  if (bits === 0) return true
  // >>> 0 keeps the mask unsigned; 32 - bits is 0..31 so the shift is defined.
  const mask = (0xffffffff << (32 - bits)) >>> 0
  return ((addr & mask) >>> 0) === ((base & mask) >>> 0)
}

export type NotifyIpDecision =
  | { allowed: true; reason: 'filter_off' | 'ip_allowed' }
  | { allowed: false; reason: 'no_list_configured' | 'no_client_ip' | 'ip_not_allowed' }

/**
 * Decides whether a notify call from `clientIp` may proceed.
 *
 * The filter is ACTIVE when the mode is 'sandbox' or 'production', or whenever
 * P24_NOTIFY_ALLOWED_IPS holds at least one entry (any mode) — decision tj
 * 2026-10-08. Consequences:
 *   - sandbox/production + empty or unset list → every call rejected (fail closed:
 *     real money must never be confirmed by an unverified caller)
 *   - mock + unset list                       → filter off, so the local
 *     mock-pay → notify server-to-server call keeps working as before
 *   - any mode + list set                     → filter enforced (lets the tests
 *     exercise the filter without real P24 keys)
 *
 * 'disabled' mode is treated like mock: notify has nothing to confirm there, and
 * the CRC-key guard already fails those calls closed further down the handler.
 */
export function decideNotifyIp(args: {
  mode?: P24Mode
  allowedRaw?: string | undefined
  clientIp: string | null | undefined
}): NotifyIpDecision {
  const mode = args.mode ?? getP24Mode()
  const list = parseAllowedIps(
    args.allowedRaw === undefined ? process.env.P24_NOTIFY_ALLOWED_IPS : args.allowedRaw,
  )
  const realMoneyMode = mode === 'sandbox' || mode === 'production'

  if (!realMoneyMode && list.length === 0) return { allowed: true, reason: 'filter_off' }
  if (list.length === 0) return { allowed: false, reason: 'no_list_configured' }

  const ip = args.clientIp ? normaliseIp(args.clientIp) : ''
  if (!ip || ip === 'unknown') return { allowed: false, reason: 'no_client_ip' }

  return list.some(entry => ipMatchesEntry(ip, entry))
    ? { allowed: true, reason: 'ip_allowed' }
    : { allowed: false, reason: 'ip_not_allowed' }
}
