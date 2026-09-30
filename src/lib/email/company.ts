import 'server-only'
import { sanityFetch } from '@/sanity/client'
import { siteSettingsQuery } from '@/sanity/queries'

export interface CompanyInfo {
  name: string
  nip: string
  regon: string
  krs: string
  address: string
}

// Same defaults as src/components/KontaktClient.tsx — company details are
// already public on the site (O-13); this just reuses that source.
const DEFAULTS: CompanyInfo = {
  name: 'HYDRA ARMS SP. Z O.O.',
  nip: '6793302181',
  regon: '528976880',
  krs: '0001111593',
  address: 'ul. Cechowa 44B, 30-614 Kraków',
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
  try {
    const settings = await sanityFetch<{
      companyName?: string
      nip?: string
      regon?: string
      krs?: string
      adresSiedziby?: string
    }>({ query: siteSettingsQuery })

    if (!settings) return DEFAULTS

    return {
      name: settings.companyName || DEFAULTS.name,
      nip: settings.nip || DEFAULTS.nip,
      regon: settings.regon || DEFAULTS.regon,
      krs: settings.krs || DEFAULTS.krs,
      address: (settings.adresSiedziby || DEFAULTS.address).replace(/\n/g, ', '),
    }
  } catch {
    return DEFAULTS
  }
}
