import HomePageClient from '@/components/HomePageClient'
import { sanityFetch } from '@/sanity/client'
import { homePageQuery, servicesQuery, distributionChannelsQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImage = any

const filaryImgMap: Record<string, string> = {
  "B2G": "/img/tactical-gun-in-olive-glove-on-white-backdrop-2026-03-20-00-48-48-utc.jpg",
  "B2B": "/img/cnc-part.png",
  "B2C": "/img/high-powered-sporting-rifle-with-scope-and-bipod-2026-01-05-00-53-07-utc.jpg",
}

export default async function HomePage() {
  let services, filary, heroData

  try {
    ;[services, filary, heroData] = await Promise.all([
      sanityFetch<{ id: string; label: string; title: string; desc: string; tags: string[]; image?: SanityImage; imagePath?: string }[]>({ query: servicesQuery }),
      sanityFetch<{ tag: string; title: string; desc: string }[]>({ query: distributionChannelsQuery }),
      sanityFetch<{ heroTagline1?: string; heroTagline2?: string; hudLabel?: string; aboutText?: string }>({ query: homePageQuery }),
    ])
  } catch {
    services = null
    filary = null
    heroData = null
  }

  const mappedServices = services?.map((s, i) => ({
    id: s.id,
    label: s.label,
    title: s.title,
    desc: s.desc,
    tags: s.tags ?? [],
    img: s.image ? urlFor(s.image).width(800).url() : s.imagePath ?? `/img/service-0${i + 1}.jpg`,
  })) ?? undefined

  const mappedFilary = filary?.map(f => ({
    ...f,
    img: filaryImgMap[f.tag] ?? "",
    href: "/wspolpraca",
  })) ?? undefined

  return (
    <HomePageClient
      services={mappedServices}
      filary={mappedFilary}
      heroTagline1={heroData?.heroTagline1}
      heroTagline2={heroData?.heroTagline2}
      hudLabel={heroData?.hudLabel}
      aboutText={heroData?.aboutText}
    />
  )
}
