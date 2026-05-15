import KontaktClient from "@/components/KontaktClient";
import { sanityFetch } from "@/sanity/client";
import { siteSettingsQuery } from "@/sanity/queries";

export default async function KontaktPage() {
  let settings = null;
  try {
    settings = await sanityFetch<{
      companyName?: string; nip?: string; regon?: string; koncesja?: string;
      emailRD?: string; emailB2G?: string; emailHandel?: string; emailBiuro?: string;
      facebookUrl?: string; instagramUrl?: string;
    }>({ query: siteSettingsQuery });
  } catch {}

  return (
    <KontaktClient
      companyName={settings?.companyName}
      nip={settings?.nip}
      regon={settings?.regon}
      koncesja={settings?.koncesja}
      emailRD={settings?.emailRD}
      emailB2G={settings?.emailB2G}
      emailHandel={settings?.emailHandel}
      emailBiuro={settings?.emailBiuro}
      facebookUrl={settings?.facebookUrl}
      instagramUrl={settings?.instagramUrl}
    />
  );
}
