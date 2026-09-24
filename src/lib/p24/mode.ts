// Pure P24 mode and CRC-key helpers — no server-only, no side effects.
// Extracted so getP24Mode / assertCrcKeySet can be unit-tested and used
// in server components without importing the full server-only index.ts.

export type P24Mode = 'mock' | 'sandbox' | 'production' | 'disabled'

/**
 * Returns the configured P24 operating mode.
 * Only an explicit 'mock' | 'sandbox' | 'production' value is accepted.
 * Any other value (including unset / typo) returns 'disabled' so the system
 * fails closed rather than accidentally activating mock mode in production.
 */
export function getP24Mode(): P24Mode {
  const m = process.env.P24_MODE
  if (m === 'mock' || m === 'sandbox' || m === 'production') return m
  return 'disabled'
}

/**
 * Returns the CRC key required for P24 signature operations.
 * Throws if the key is absent or empty so sign/verify never run with an
 * empty key that would produce forgeable signatures.
 */
export function assertCrcKeySet(): string {
  const k = process.env.P24_CRC_KEY
  if (!k) throw new Error('P24_CRC_KEY is not configured')
  return k
}
