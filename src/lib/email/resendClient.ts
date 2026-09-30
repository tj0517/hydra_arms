import 'server-only'
import { Resend } from 'resend'

/**
 * Test mode: no real Resend call is made, emails are rendered and logged only.
 * Fail-closed — triggered ONLY by the explicit RESEND_MOCK=true flag (set in
 * .env.development.local and forced in playwright.config.ts). A missing
 * RESEND_API_KEY does NOT switch to mock — real mode with no key throws
 * (see getResendClient), caught by the non-fatal send path.
 */
export function isEmailMockMode(): boolean {
  return process.env.RESEND_MOCK === 'true'
}

let client: Resend | null = null

export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    client = new Resend(apiKey)
  }
  return client
}
