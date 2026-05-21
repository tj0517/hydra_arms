import HomePageClient from '@/components/HomePageClient'
import { sanityFetch } from '@/sanity/client'
import { homePageQuery, servicesQuery, distributionChannelsQuery } from '@/sanity/queries'
import { urlFor } from '@/sanity/image'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImage = any

const filaryImgFallback: Record<string, string> = {
  "B2G": "/img/vest-blueprint.png",
  "B2B": "/img/caliper-blueprint.png",
  "B2C": "/img/scope-blueprint.png",
}

export default async function HomePage() {
  let services, filary: ({ tag: string; title: string; desc: string; image?: SanityImage } | null)[] | null, heroData

  try {
    ;[services, filary, heroData] = await Promise.all([
      sanityFetch<{ id: string; label: string; title: string; desc: string; tags: string[]; image?: SanityImage; imagePath?: string }[]>({ query: servicesQuery }),
      sanityFetch<{ tag: string; title: string; desc: string; image?: SanityImage }[]>({ query: distributionChannelsQuery }),
      sanityFetch<{ heroTagline1?: string; heroTagline2?: string; hudLabel?: string; aboutText?: string; heroVideo?: string }>({ query: homePageQuery }),
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
    tag: f?.tag ?? '',
    title: f?.title ?? '',
    desc: f?.desc ?? '',
    img: f?.image ? urlFor(f.image).width(800).url() : filaryImgFallback[f?.tag ?? ''] ?? '',
    href: "/wspolpraca",
  })) ?? undefined

  return (
    <HomePageClient
      services={mappedServices}
      filary={mappedFilary}
      heroTagline1={heroData?.heroTagline1 || undefined}
      heroTagline2={heroData?.heroTagline2 || undefined}
      hudLabel={heroData?.hudLabel || undefined}
      aboutText={heroData?.aboutText || undefined}
      heroVideo={heroData?.heroVideo || undefined}
    />
  )
}
