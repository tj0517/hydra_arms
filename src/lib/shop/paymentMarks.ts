// Decision for the footer slot of the official P24 payment-method marks (HA-2.08).
// Pure — no server-only, no process.env, no fs — so it can be unit-tested.
// The server wrapper that reads the environment and the filesystem is getPaymentMarks()
// in src/lib/shop/shopMode.ts.

import { parseShopMode } from '../../../config/inputsCheck'

/** Where the real marks are dropped (public/…); the first existing extension wins. */
export const PAYMENT_MARKS_DIR = 'payment-marks'
export const PAYMENT_MARKS_BASENAME = 'p24-marks'
export const PAYMENT_MARKS_EXTENSIONS = ['svg', 'png', 'webp', 'jpg'] as const

export type PaymentMarks =
  | { kind: 'image'; src: string }
  | { kind: 'placeholder' }
  | { kind: 'none' }

/**
 * - the real asset exists → show it, in every mode;
 * - no asset → neutral placeholder only in verification mode, or in dev (SHOP_MODE unset AND not a
 *   production build); everything else (live, production build, unknown SHOP_MODE) → render nothing.
 */
export function decidePaymentMarks(input: {
  rawShopMode: string | undefined
  nodeEnv: string | undefined
  /** Public URL of the real asset (e.g. "/payment-marks/p24-marks.svg"), or null when there is none. */
  assetSrc: string | null
}): PaymentMarks {
  if (input.assetSrc) return { kind: 'image', src: input.assetSrc }
  const parsed = parseShopMode(input.rawShopMode)
  if (!parsed.ok) return { kind: 'none' }
  if (parsed.mode === 'verification') return { kind: 'placeholder' }
  if (parsed.mode === 'dev' && input.nodeEnv !== 'production') return { kind: 'placeholder' }
  return { kind: 'none' }
}
