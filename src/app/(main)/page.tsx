import HomePageClient from '@/components/HomePageClient'
import { sanityFetch } from '@/sanity/client'
import { homePageQuery, servicesQuery, distributionChannelsQuery } from '@/sanity/queries'

export default async function HomePage() {
  let services, filary, heroData

  try {
    ;[services, filary, heroData] = await Promise.all([
      sanityFetch<{ id: string; label: string; title: string; desc: string; tags: string[]; imagePath?: string }[]>({ query: servicesQuery }),
      sanityFetch<{ tag: string; title: string; desc: string }[]>({ query: distributionChannelsQuery }),
      sanityFetch<{ heroTagline1?: string; heroTagline2?: string; hudLabel?: string; aboutText?: string }>({ query: homePageQuery }),
    ])
  } catch {
    services = null
    filary = null
    heroData = null
  }

  // Map Sanity services to local format (use imagePath as img fallback)
  const mappedServices = services?.map((s, i) => ({
    id: s.id,
    label: s.label,
    title: s.title,
    desc: s.desc,
    tags: s.tags ?? [],
    img: s.imagePath ?? `/service-0${i + 1}.jpg`,
  })) ?? undefined

  return (
    <HomePageClient
      services={mappedServices}
      filary={filary ?? undefined}
      heroTagline1={heroData?.heroTagline1}
      heroTagline2={heroData?.heroTagline2}
      hudLabel={heroData?.hudLabel}
      aboutText={heroData?.aboutText}
    />
  )
}
