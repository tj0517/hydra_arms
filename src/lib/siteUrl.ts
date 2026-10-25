// One domain value (SITE_URL, O-31 → hydra-arms.com) drives every absolute URL the app builds.
// Two readers on purpose, because a wrong guess costs different things:
// - SEO (metadata, sitemap, robots, JSON-LD) must always render something, and the main domain
//   is a safe guess — so siteUrl() falls back to it.
// - Payments and e-mail links send the customer somewhere real (P24 urlReturn/urlStatus, order
//   status links). A guessed domain on a preview or local build would send them to production,
//   so shopBaseUrl() has no fallback: missing → null → the caller refuses or omits the link.
// Neither reads the request Host header — it is client-controlled.

const DEFAULT_SITE_URL = 'https://hydra-arms.com'

function readSiteUrl(): string | null {
  const base = (process.env.SITE_URL ?? '').trim().replace(/\/+$/, '')
  return /^https?:\/\/[^/]/.test(base) ? base : null
}

/** SITE_URL without trailing slash, or https://hydra-arms.com. For SEO only. */
export function siteUrl(): string {
  return readSiteUrl() ?? DEFAULT_SITE_URL
}

/** SITE_URL without trailing slash, or null when empty / not absolute http(s). Never falls back. */
export function shopBaseUrl(): string | null {
  return readSiteUrl()
}
