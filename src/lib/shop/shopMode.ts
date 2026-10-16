import 'server-only'
import { parseShopMode } from '../../../config/inputsCheck'
import { getP24Mode } from '@/lib/p24/mode'
import {
  evaluateCheckoutGate,
  isBaseLinkerPushAllowed,
  type CheckoutGate,
} from '@/lib/shop/shopModeGate'

/**
 * The one place that reads SHOP_MODE on the server (HA-2.08). Everything else —
 * banner, checkout, payment registration, BaseLinker push — goes through here.
 */

/** True only for an explicit, valid SHOP_MODE=verification. */
export function isVerificationMode(): boolean {
  const parsed = parseShopMode(process.env.SHOP_MODE)
  return parsed.ok && parsed.mode === 'verification'
}

export function getCheckoutGate(): CheckoutGate {
  return evaluateCheckoutGate(process.env.SHOP_MODE, getP24Mode())
}

export function canPushToBaseLinker(): boolean {
  return isBaseLinkerPushAllowed(process.env.SHOP_MODE)
}
