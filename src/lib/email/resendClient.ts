import 'server-only'
import { Resend } from 'resend'

/**
 * Test mode: no real Resend call is made, emails are rendered and logged only.
 * Triggered by either condition — RESEND_API_KEY absent (contact/newsletter routes'
 * existing behaviour) or RESEND_MOCK=true (explicit flag, set in .env.development.local
 * and forced in playwright.config.ts so shop tests never depend on whatever key happens
 * to be present locally).
 */
export function isEmailMockMode(): boolean {
  return !process.env.RESEND_API_KEY || process.env.RESEND_MOCK === 'true'
}

let client: Resend | null = null

export function getResendClient(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY)
  }
  return client
}
