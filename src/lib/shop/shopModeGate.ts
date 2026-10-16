// Pure SHOP_MODE gate (HA-2.08) — no server-only, no process.env, so it can be unit-tested.
// The server wrapper that reads the environment is src/lib/shop/shopMode.ts.
//
// SHOP_MODE parsing is NOT repeated here: it is the registry parser (HA-2.16).

import { parseShopMode, type ShopMode } from '../../../config/inputsCheck'
import type { P24Mode } from '../p24/mode'

/** In verification mode a customer may only pay on the mock or the P24 sandbox. */
export const VERIFICATION_ALLOWED_P24_MODES: readonly P24Mode[] = ['mock', 'sandbox']

/** In live mode a customer may only pay on real P24 — never on the mock or the sandbox. */
export const LIVE_ALLOWED_P24_MODES: readonly P24Mode[] = ['production']

export type CheckoutGate =
  | { allowed: true; shopMode: ShopMode }
  | { allowed: false; reason: 'shop_mode_invalid' | 'p24_mode_not_allowed' }

/**
 * Decides whether checkout may create an order at all. Fails closed:
 * - unknown SHOP_MODE → refuse (never fall back to dev/live behaviour);
 * - verification + any P24 mode other than mock/sandbox (production, disabled, typo) → refuse;
 * - live + any P24 mode other than production (mock, sandbox, disabled, typo) → refuse.
 * dev is unchanged by this task.
 */
export function evaluateCheckoutGate(
  rawShopMode: string | undefined,
  p24Mode: P24Mode,
): CheckoutGate {
  const parsed = parseShopMode(rawShopMode)
  if (!parsed.ok) return { allowed: false, reason: 'shop_mode_invalid' }
  if (parsed.mode === 'verification' && !VERIFICATION_ALLOWED_P24_MODES.includes(p24Mode)) {
    return { allowed: false, reason: 'p24_mode_not_allowed' }
  }
  if (parsed.mode === 'live' && !LIVE_ALLOWED_P24_MODES.includes(p24Mode)) {
    return { allowed: false, reason: 'p24_mode_not_allowed' }
  }
  return { allowed: true, shopMode: parsed.mode }
}

/**
 * May a paid order be pushed to BaseLinker? Only when the mode is known and is not
 * verification. An unknown mode answers false (fail closed): the order stays paid
 * without a BL id and the orphan retry in /api/shop/orders/sync picks it up once the
 * mode is fixed.
 */
export function isBaseLinkerPushAllowed(rawShopMode: string | undefined): boolean {
  const parsed = parseShopMode(rawShopMode)
  return parsed.ok && parsed.mode !== 'verification'
}
