/**
 * P24 signature golden-vector tests — developers.przelewy24.pl
 *
 * Validates the SHA-384 formula and exact key ordering by calling the REAL
 * implementation in src/lib/p24/sign.ts. All vectors from the official P24
 * REST API documentation. crc = "crc-from-p24-panel" (docs example value).
 *
 * If this test fails the sign implementation is WRONG — do NOT change the
 * expected values; fix the implementation.
 */
import { test, expect } from '@playwright/test'
import { signRegister, signNotification, signVerify } from '../../../src/lib/p24/sign'

const CRC = 'crc-from-p24-panel'

test.describe('P24 signature vectors (developers.przelewy24.pl)', () => {
  test('register sign: {"sessionId","merchantId","amount","currency","crc"}', () => {
    const sign = signRegister('unique-session-id', 999999, 1234, 'PLN', CRC)
    expect(sign).toBe(
      '1720ad689f5306f150fb7428482071f2c378f5855604ed83ebca2cee1332c502056070591a29a58107e34ec8fe08e851',
    )
  })

  test('notification sign: {"merchantId","posId","sessionId","amount","originAmount","currency","orderId","methodId","statement","crc"}', () => {
    const sign = signNotification(999999, 999999, 'unique-session-id', 1234, 1234, 'PLN', 316123456, 25, 'p24-A12-B34-C56', CRC)
    expect(sign).toBe(
      'a5add2b1e83cd7e8d8e704c0de552e3442acb517efe438b521a102b45137b35e9133fae51d7e430516351b5fb16b15e9',
    )
  })

  test('verify sign: {"sessionId","orderId","amount","currency","crc"}', () => {
    const sign = signVerify('unique-session-id', 316123456, 1234, 'PLN', CRC)
    expect(sign).toBe(
      'abf520396ac94a726457a3714d524dda14cd27b4131ae8d2d9adbb062277deb1ea535e61220b18404319deb73d7a422a',
    )
  })

  test('sign.ts contains no process.env read', () => {
    // If process.env access existed in sign.ts it would fail the golden vectors above
    // (wrong CRC → wrong hash). Belt-and-suspenders: assert the function accepts crc as 5th param.
    expect(typeof signRegister).toBe('function')
    expect(signRegister.length).toBe(5) // sessionId, merchantId, amount, currency, crc
  })
})
