/**
 * Unit tests for the P24 notify IP allowlist (HA-2.20).
 *
 * These run in the test-runner Node.js process (not the webServer), so they
 * manipulate process.env directly and import the pure module
 * src/lib/p24/notifyIp.ts without server-only restrictions.
 *
 * Red proof covered here:
 *   - fail closed: P24_MODE=sandbox with an unset/empty allowlist rejects every
 *     IP, before any P24 or DB contact.
 *
 * If this test fails the IP guard is broken — do NOT change the expected
 * values; fix the implementation in src/lib/p24/notifyIp.ts.
 */
import { test, expect } from '@playwright/test'
import {
  parseAllowedIps,
  normaliseIp,
  ipMatchesEntry,
  decideNotifyIp,
} from '../../../src/lib/p24/notifyIp'

// The real list published by Przelewy24 ("Adresy IP serwerów" / "Server IP
// addresses"), used here only as realistic test input — never as a default.
const P24_DOC_LIST =
  '5.252.202.255, 5.252.202.254, 20.215.81.124, 193.178.213.0/24, 91.220.177.0/24, 20.215.183.48/28, 134.112.88.8/29'

// ── parseAllowedIps ──────────────────────────────────────────────────────────

test.describe('parseAllowedIps', () => {
  test('unset / empty / whitespace → empty list', () => {
    expect(parseAllowedIps(undefined)).toEqual([])
    expect(parseAllowedIps('')).toEqual([])
    expect(parseAllowedIps('   ')).toEqual([])
    expect(parseAllowedIps(' , , ')).toEqual([])
  })

  test('comma-separated entries are trimmed', () => {
    expect(parseAllowedIps('1.2.3.4, 5.6.7.0/24 ,8.9.10.11')).toEqual([
      '1.2.3.4', '5.6.7.0/24', '8.9.10.11',
    ])
  })

  test('the documented P24 list parses to 7 entries', () => {
    expect(parseAllowedIps(P24_DOC_LIST)).toHaveLength(7)
  })
})

// ── normaliseIp ──────────────────────────────────────────────────────────────

test.describe('normaliseIp', () => {
  test('strips IPv4-mapped IPv6 prefix', () => {
    expect(normaliseIp('::ffff:5.252.202.254')).toBe('5.252.202.254')
  })

  test('strips a trailing port', () => {
    expect(normaliseIp('5.252.202.254:49152')).toBe('5.252.202.254')
  })

  test('leaves a plain IPv4 and a real IPv6 alone', () => {
    expect(normaliseIp(' 1.2.3.4 ')).toBe('1.2.3.4')
    expect(normaliseIp('2001:db8::1')).toBe('2001:db8::1')
  })
})

// ── ipMatchesEntry ───────────────────────────────────────────────────────────

test.describe('ipMatchesEntry — single addresses', () => {
  test('exact match', () => {
    expect(ipMatchesEntry('5.252.202.254', '5.252.202.254')).toBe(true)
  })

  test('different address does not match', () => {
    expect(ipMatchesEntry('5.252.202.253', '5.252.202.254')).toBe(false)
  })

  test('leading-zero / malformed input does not match', () => {
    expect(ipMatchesEntry('05.252.202.254', '5.252.202.254')).toBe(false)
    expect(ipMatchesEntry('5.252.202', '5.252.202.254')).toBe(false)
    expect(ipMatchesEntry('5.252.202.999', '5.252.202.254')).toBe(false)
  })
})

test.describe('ipMatchesEntry — CIDR ranges from the P24 docs', () => {
  test('/24 — in range and out of range', () => {
    expect(ipMatchesEntry('193.178.213.1', '193.178.213.0/24')).toBe(true)
    expect(ipMatchesEntry('193.178.213.255', '193.178.213.0/24')).toBe(true)
    expect(ipMatchesEntry('193.178.214.1', '193.178.213.0/24')).toBe(false)
  })

  test('/28 — 20.215.183.48/28 covers .48–.63 only', () => {
    expect(ipMatchesEntry('20.215.183.48', '20.215.183.48/28')).toBe(true)
    expect(ipMatchesEntry('20.215.183.63', '20.215.183.48/28')).toBe(true)
    expect(ipMatchesEntry('20.215.183.47', '20.215.183.48/28')).toBe(false)
    expect(ipMatchesEntry('20.215.183.64', '20.215.183.48/28')).toBe(false)
  })

  test('/29 — 134.112.88.8/29 covers .8–.15 only', () => {
    expect(ipMatchesEntry('134.112.88.8', '134.112.88.8/29')).toBe(true)
    expect(ipMatchesEntry('134.112.88.15', '134.112.88.8/29')).toBe(true)
    expect(ipMatchesEntry('134.112.88.7', '134.112.88.8/29')).toBe(false)
    expect(ipMatchesEntry('134.112.88.16', '134.112.88.8/29')).toBe(false)
  })

  test('IPv6 client never matches an IPv4 range', () => {
    expect(ipMatchesEntry('2001:db8::1', '193.178.213.0/24')).toBe(false)
  })

  test('malformed CIDR entry matches nothing', () => {
    expect(ipMatchesEntry('1.2.3.4', '1.2.3.4/33')).toBe(false)
    expect(ipMatchesEntry('1.2.3.4', '1.2.3.4/abc')).toBe(false)
  })
})

// ── decideNotifyIp — the decision table (decision tj 2026-10-08) ─────────────

test.describe('decideNotifyIp — filter off', () => {
  test('mock + unset list → filter off (mock-pay keeps working)', () => {
    const d = decideNotifyIp({ mode: 'mock', allowedRaw: undefined, clientIp: null })
    expect(d.allowed).toBe(true)
    expect(d.reason).toBe('filter_off')
  })

  test('mock + empty list → filter off', () => {
    const d = decideNotifyIp({ mode: 'mock', allowedRaw: '', clientIp: '9.9.9.9' })
    expect(d.allowed).toBe(true)
    expect(d.reason).toBe('filter_off')
  })

  test('disabled + unset list → filter off (CRC guard still gates the call)', () => {
    const d = decideNotifyIp({ mode: 'disabled', allowedRaw: undefined, clientIp: null })
    expect(d.allowed).toBe(true)
  })
})

test.describe('decideNotifyIp — RED PROOF: fail closed in sandbox/production', () => {
  test('sandbox + unset list → rejected for any IP', () => {
    for (const ip of ['5.252.202.254', '193.178.213.7', '1.2.3.4', null, 'unknown']) {
      const d = decideNotifyIp({ mode: 'sandbox', allowedRaw: undefined, clientIp: ip })
      expect(d.allowed, `ip=${ip}`).toBe(false)
      expect(d.reason).toBe('no_list_configured')
    }
  })

  test('sandbox + empty list → rejected', () => {
    const d = decideNotifyIp({ mode: 'sandbox', allowedRaw: '   ', clientIp: '5.252.202.254' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('no_list_configured')
  })

  test('production + unset list → rejected', () => {
    const d = decideNotifyIp({ mode: 'production', allowedRaw: undefined, clientIp: '5.252.202.254' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('no_list_configured')
  })

  test('sandbox + unset list: reading P24_NOTIFY_ALLOWED_IPS from env also fails closed', () => {
    const orig = process.env.P24_NOTIFY_ALLOWED_IPS
    try {
      delete process.env.P24_NOTIFY_ALLOWED_IPS
      const d = decideNotifyIp({ mode: 'sandbox', clientIp: '5.252.202.254' })
      expect(d.allowed).toBe(false)
      expect(d.reason).toBe('no_list_configured')
    } finally {
      if (orig === undefined) delete process.env.P24_NOTIFY_ALLOWED_IPS
      else process.env.P24_NOTIFY_ALLOWED_IPS = orig
    }
  })
})

test.describe('decideNotifyIp — filter enforced with a list', () => {
  test('sandbox + documented list: a P24 address is allowed', () => {
    for (const ip of ['5.252.202.254', '20.215.81.124', '193.178.213.7', '134.112.88.9']) {
      const d = decideNotifyIp({ mode: 'sandbox', allowedRaw: P24_DOC_LIST, clientIp: ip })
      expect(d.allowed, `ip=${ip}`).toBe(true)
      expect(d.reason).toBe('ip_allowed')
    }
  })

  test('RED PROOF: sandbox + documented list: a foreign address is rejected', () => {
    for (const ip of ['1.2.3.4', '193.178.214.1', '134.112.88.16']) {
      const d = decideNotifyIp({ mode: 'sandbox', allowedRaw: P24_DOC_LIST, clientIp: ip })
      expect(d.allowed, `ip=${ip}`).toBe(false)
      expect(d.reason).toBe('ip_not_allowed')
    }
  })

  test('mock + list set → filter enforced (how the API test exercises it)', () => {
    expect(decideNotifyIp({ mode: 'mock', allowedRaw: '5.252.202.254', clientIp: '5.252.202.254' }).allowed).toBe(true)
    expect(decideNotifyIp({ mode: 'mock', allowedRaw: '5.252.202.254', clientIp: '1.2.3.4' }).allowed).toBe(false)
  })

  test('missing client IP with an active filter → rejected', () => {
    const d = decideNotifyIp({ mode: 'mock', allowedRaw: P24_DOC_LIST, clientIp: null })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('no_client_ip')
  })

  test("getClientIp's 'unknown' sentinel → rejected", () => {
    const d = decideNotifyIp({ mode: 'mock', allowedRaw: P24_DOC_LIST, clientIp: 'unknown' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('no_client_ip')
  })

  test('IPv4-mapped IPv6 form of a listed address is allowed', () => {
    const d = decideNotifyIp({ mode: 'sandbox', allowedRaw: P24_DOC_LIST, clientIp: '::ffff:5.252.202.254' })
    expect(d.allowed).toBe(true)
  })
})
