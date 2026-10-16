/**
 * Unit tests for the footer P24-marks decision (HA-2.08). Pure function — no server, no env.
 * The placeholder is for verification/dev only; a production build without the real asset
 * renders nothing. If one fails fix src/lib/shop/paymentMarks.ts, not the expected values.
 */
import { test, expect } from '@playwright/test'
import { decidePaymentMarks } from '../../../src/lib/shop/paymentMarks'

const ASSET = '/payment-marks/p24-marks.svg'

test.describe('decidePaymentMarks — no asset', () => {
  test('verification → placeholder (any NODE_ENV)', () => {
    for (const nodeEnv of ['development', 'production', 'test', undefined]) {
      expect(decidePaymentMarks({ rawShopMode: 'verification', nodeEnv, assetSrc: null })).toEqual({ kind: 'placeholder' })
    }
  })

  test('dev (SHOP_MODE unset or empty) outside a production build → placeholder', () => {
    for (const raw of [undefined, '']) {
      for (const nodeEnv of ['development', 'test', undefined]) {
        expect(decidePaymentMarks({ rawShopMode: raw, nodeEnv, assetSrc: null })).toEqual({ kind: 'placeholder' })
      }
    }
  })

  test('RED PROOF: production build, SHOP_MODE unset, no asset → nothing', () => {
    for (const raw of [undefined, '']) {
      expect(decidePaymentMarks({ rawShopMode: raw, nodeEnv: 'production', assetSrc: null })).toEqual({ kind: 'none' })
    }
  })

  test('live → nothing (any NODE_ENV)', () => {
    for (const nodeEnv of ['development', 'production']) {
      expect(decidePaymentMarks({ rawShopMode: 'live', nodeEnv, assetSrc: null })).toEqual({ kind: 'none' })
    }
  })

  test('unknown SHOP_MODE → nothing (fail closed)', () => {
    for (const bad of ['Verification', 'test', 'production']) {
      expect(decidePaymentMarks({ rawShopMode: bad, nodeEnv: 'development', assetSrc: null })).toEqual({ kind: 'none' })
    }
  })
})

test.describe('decidePaymentMarks — real asset exists', () => {
  test('shows the image in every mode and build', () => {
    for (const raw of [undefined, 'verification', 'live', 'bogus']) {
      for (const nodeEnv of ['development', 'production']) {
        expect(decidePaymentMarks({ rawShopMode: raw, nodeEnv, assetSrc: ASSET })).toEqual({ kind: 'image', src: ASSET })
      }
    }
  })
})
