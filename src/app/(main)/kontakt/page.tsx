import type { Metadata } from 'next'
import KontaktClient from "@/components/KontaktClient";

export const metadata: Metadata = {
  title: 'Kontakt',
  description:
    'Skontaktuj się z HYDRA ARMS. Dane kontaktowe, mapa dojazdu oraz formularz kontaktowy dla zapytań B2G, B2B i handlowych.',
  alternates: { canonical: '/kontakt' },
  openGraph: {
    title: 'Kontakt | HYDRA ARMS',
    description:
      'Skontaktuj się z HYDRA ARMS. Dane kontaktowe i formularz dla zapytań B2G, B2B i handlowych.',
    url: '/kontakt',
  },
}
import { sanityFetch } from "@/sanity/client";
import { siteSettingsQuery, certyfikatyPageQuery } from "@/sanity/queries";

export default async function KontaktPage() {
  let settings = null;
  let certData: { certificates?: { name: string; desc?: string }[] } | null = null;
  try {
    [settings, certData] = await Promise.all([
      sanityFetch<{
        companyName?: string; nip?: string; regon?: string; koncesja?: string;
        krs?: string; ncage?: string; duns?: string; bdo?: string; uei?: string;
        adresSiedziby?: string; adresSklep?: string;
        emailRD?: string; emailB2G?: string; emailHandel?: string; emailBiuro?: string;
        facebookUrl?: string; instagramUrl?: string;
      }>({ query: siteSettingsQuery }),
      sanityFetch<{ certificates?: { name: string; desc?: string }[] }>({ query: certyfikatyPageQuery }),
    ]);
  } catch {}

  return (
    <KontaktClient
      companyName={settings?.companyName}
      nip={settings?.nip}
      regon={settings?.regon}
      koncesja={settings?.koncesja}
      krs={settings?.krs}
      ncage={settings?.ncage}
      duns={settings?.duns}
      bdo={settings?.bdo}
      uei={settings?.uei}
      adresSiedziby={settings?.adresSiedziby}
      adresSklep={settings?.adresSklep}
      emailRD={settings?.emailRD}
      emailB2G={settings?.emailB2G}
      emailHandel={settings?.emailHandel}
      emailBiuro={settings?.emailBiuro}
      facebookUrl={settings?.facebookUrl}
      instagramUrl={settings?.instagramUrl}
      certificates={certData?.certificates}
    />
  );
}
