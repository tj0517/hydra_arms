/**
 * Unit tests for getP24Mode() and assertCrcKeySet() — fail-closed guards.
 *
 * These run in the test-runner Node.js process (not the webServer), so they
 * manipulate process.env directly and import pure modules from src/lib/p24/mode.ts
 * without server-only restrictions.
 *
 * If this test fails the mode guard is broken — do NOT change the expected
 * values; fix the implementation in src/lib/p24/mode.ts.
 */
import { test, expect } from '@playwright/test'
import { getP24Mode, assertCrcKeySet } from '../../../src/lib/p24/mode'

// process.env mutations — run serially to avoid cross-test interference
test.describe.configure({ mode: 'serial' })

// ── getP24Mode ───────────────────────────────────────────────────────────────

test.describe('getP24Mode — explicit values accepted', () => {
  test('P24_MODE=mock → mock', () => {
    const orig = process.env.P24_MODE
    try {
      process.env.P24_MODE = 'mock'
      expect(getP24Mode()).toBe('mock')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })

  test('P24_MODE=sandbox → sandbox', () => {
    const orig = process.env.P24_MODE
    try {
      process.env.P24_MODE = 'sandbox'
      expect(getP24Mode()).toBe('sandbox')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })

  test('P24_MODE=production → production', () => {
    const orig = process.env.P24_MODE
    try {
      process.env.P24_MODE = 'production'
      expect(getP24Mode()).toBe('production')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })
})

test.describe('getP24Mode — fail-closed on invalid / missing values', () => {
  test('P24_MODE unset → disabled (not mock)', () => {
    const orig = process.env.P24_MODE
    try {
      delete process.env.P24_MODE
      expect(getP24Mode()).toBe('disabled')
      expect(getP24Mode()).not.toBe('mock')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })

  test('P24_MODE=empty string → disabled', () => {
    const orig = process.env.P24_MODE
    try {
      process.env.P24_MODE = ''
      expect(getP24Mode()).toBe('disabled')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })

  test('P24_MODE=typo value (Mock) → disabled', () => {
    const orig = process.env.P24_MODE
    try {
      process.env.P24_MODE = 'Mock'
      expect(getP24Mode()).toBe('disabled')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })

  test('P24_MODE=production → not mock (mock surface must be blocked)', () => {
    const orig = process.env.P24_MODE
    try {
      process.env.P24_MODE = 'production'
      expect(getP24Mode()).not.toBe('mock')
    } finally {
      if (orig === undefined) delete process.env.P24_MODE; else process.env.P24_MODE = orig
    }
  })
})

// ── assertCrcKeySet ──────────────────────────────────────────────────────────

test.describe('assertCrcKeySet — fail-closed on empty / missing CRC', () => {
  test('non-empty key → returns the key', () => {
    const orig = process.env.P24_CRC_KEY
    try {
      process.env.P24_CRC_KEY = 'test-crc-key'
      expect(assertCrcKeySet()).toBe('test-crc-key')
    } finally {
      if (orig === undefined) delete process.env.P24_CRC_KEY; else process.env.P24_CRC_KEY = orig
    }
  })

  test('empty string → throws P24_CRC_KEY is not configured', () => {
    const orig = process.env.P24_CRC_KEY
    try {
      process.env.P24_CRC_KEY = ''
      expect(() => assertCrcKeySet()).toThrow('P24_CRC_KEY is not configured')
    } finally {
      if (orig === undefined) delete process.env.P24_CRC_KEY; else process.env.P24_CRC_KEY = orig
    }
  })

  test('unset → throws P24_CRC_KEY is not configured', () => {
    const orig = process.env.P24_CRC_KEY
    try {
      delete process.env.P24_CRC_KEY
      expect(() => assertCrcKeySet()).toThrow('P24_CRC_KEY is not configured')
    } finally {
      if (orig === undefined) delete process.env.P24_CRC_KEY; else process.env.P24_CRC_KEY = orig
    }
  })
})
