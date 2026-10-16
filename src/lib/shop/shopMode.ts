import 'server-only'
import { existsSync } from 'fs'
import path from 'path'
import { parseShopMode } from '../../../config/inputsCheck'
import { getP24Mode } from '@/lib/p24/mode'
import {
  decidePaymentMarks,
  PAYMENT_MARKS_BASENAME,
  PAYMENT_MARKS_DIR,
  PAYMENT_MARKS_EXTENSIONS,
  type PaymentMarks,
} from '@/lib/shop/paymentMarks'
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

/** Footer slot for the P24 marks: the real file if it exists in public/, else the mode-dependent placeholder. */
export function getPaymentMarks(): PaymentMarks {
  const ext = PAYMENT_MARKS_EXTENSIONS.find(e =>
    existsSync(path.join(process.cwd(), 'public', PAYMENT_MARKS_DIR, `${PAYMENT_MARKS_BASENAME}.${e}`)),
  )
  return decidePaymentMarks({
    rawShopMode: process.env.SHOP_MODE,
    nodeEnv: process.env.NODE_ENV,
    assetSrc: ext ? `/${PAYMENT_MARKS_DIR}/${PAYMENT_MARKS_BASENAME}.${ext}` : null,
  })
}
