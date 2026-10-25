import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteUrl'

// Replaces public/robots.txt (HA-2.21) so the Sitemap line follows SITE_URL.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/studio/', '/api/', '/konto/'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
