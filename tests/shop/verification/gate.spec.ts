/**
 * Unit tests for the SHOP_MODE gate (HA-2.08). Pure functions — no server, no env.
 * If one fails the fail-closed rule is broken: fix src/lib/shop/shopModeGate.ts,
 * do not change the expected values.
 */
import { test, expect } from '@playwright/test'
import { evaluateCheckoutGate, isBaseLinkerPushAllowed } from '../../../src/lib/shop/shopModeGate'
import type { P24Mode } from '../../../src/lib/p24/mode'

const P24_MODES: P24Mode[] = ['mock', 'sandbox', 'production', 'disabled']

test.describe('evaluateCheckoutGate', () => {
  for (const p24 of ['mock', 'sandbox'] as const) {
    test(`verification + ${p24} → allowed`, () => {
      expect(evaluateCheckoutGate('verification', p24)).toEqual({ allowed: true, shopMode: 'verification' })
    })
  }

  for (const p24 of ['production', 'disabled'] as const) {
    test(`RED PROOF: verification + ${p24} → refused`, () => {
      expect(evaluateCheckoutGate('verification', p24)).toEqual({ allowed: false, reason: 'p24_mode_not_allowed' })
    })
  }

  for (const bad of ['Verification', 'VERIFICATION', 'test', 'production', ' verification', 'verification ']) {
    for (const p24 of P24_MODES) {
      test(`unknown SHOP_MODE ${JSON.stringify(bad)} + ${p24} → refused`, () => {
        expect(evaluateCheckoutGate(bad, p24)).toEqual({ allowed: false, reason: 'shop_mode_invalid' })
      })
    }
  }

  test('unset and empty SHOP_MODE are dev — unchanged by this task, any P24 mode', () => {
    for (const raw of [undefined, '']) {
      for (const p24 of P24_MODES) {
        expect(evaluateCheckoutGate(raw, p24)).toEqual({ allowed: true, shopMode: 'dev' })
      }
    }
  })

  test('live + production → allowed', () => {
    expect(evaluateCheckoutGate('live', 'production')).toEqual({ allowed: true, shopMode: 'live' })
  })

  for (const p24 of ['mock', 'sandbox', 'disabled'] as const) {
    test(`RED PROOF: live + ${p24} → refused`, () => {
      expect(evaluateCheckoutGate('live', p24)).toEqual({ allowed: false, reason: 'p24_mode_not_allowed' })
    })
  }
})

test.describe('isBaseLinkerPushAllowed', () => {
  test('verification → no push', () => {
    expect(isBaseLinkerPushAllowed('verification')).toBe(false)
  })
  test('unknown SHOP_MODE → no push (fail closed)', () => {
    for (const bad of ['Verification', 'test', 'production']) {
      expect(isBaseLinkerPushAllowed(bad)).toBe(false)
    }
  })
  test('dev (unset / empty) and live → push', () => {
    expect(isBaseLinkerPushAllowed(undefined)).toBe(true)
    expect(isBaseLinkerPushAllowed('')).toBe(true)
    expect(isBaseLinkerPushAllowed('live')).toBe(true)
  })
})
